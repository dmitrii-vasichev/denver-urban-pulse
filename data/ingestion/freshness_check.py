"""
Source vs DB freshness check.

For each data source, compare the max date available at the upstream API
with the max date currently in the corresponding stg_* table. Classifies
each source into one of:

    ok              — DB is caught up with the source
    source_lag      — source itself publishes with a delay (not our bug)
    pipeline_behind — DB is meaningfully older than source (our bug)
    unknown         — couldn't determine source or DB max (treat as warning)

Results are upserted into pipeline_source_freshness for the UI/API to read.

Exit code:
    0 — no sources in 'pipeline_behind' state
    1 — at least one source is in 'pipeline_behind' state (hard fail)

Usage:
    python data/ingestion/freshness_check.py
"""

import logging
import os
import sys
from datetime import date, datetime, timedelta, timezone

import requests

from arcgis_client import _request_with_retry
from db import get_connection

logger = logging.getLogger(__name__)

# ── Thresholds ─────────────────────────────────────────────────────────
#
# DRIFT_THRESHOLD_DAYS: how far DB may fall behind source before we treat
#   it as a pipeline regression. 2 days is generous enough to absorb cron
#   timing jitter and weekends, strict enough to surface real bugs quickly.
#
# SOURCE_LAG_THRESHOLD_DAYS: if the source itself is older than this (vs.
#   today), flag it as source_lag so the UI can differentiate it from a
#   pipeline bug. Crashes dataset routinely runs 20-30d behind, so the
#   threshold has to be >= 7 to avoid noise.
DRIFT_THRESHOLD_DAYS = 2
SOURCE_LAG_THRESHOLD_DAYS = 7

# ── Source configuration ───────────────────────────────────────────────

ARCGIS_SOURCES = [
    {
        "source": "crime",
        "url": "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_CRIME_OFFENSES_P/FeatureServer/324",
        "date_field": "REPORTED_DATE",
        "stg_table": "stg_crime",
        "stg_date_column": "reported_date",
    },
    {
        "source": "crashes",
        "url": "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_CRIME_TRAFFICACCIDENTS5YR_P/FeatureServer/325",
        "date_field": "reported_date",
        "stg_table": "stg_crashes",
        "stg_date_column": "reported_date",
    },
    {
        "source": "311",
        "url": "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_service_requests_311/FeatureServer/66",
        "date_field": "Case_Created_Date",
        "stg_table": "stg_311",
        "stg_date_column": "case_created_date",
    },
]

AIRNOW_BASE_URL = "https://www.airnowapi.org/aq/observation/latLong/historical/"
AIRNOW_TIMEOUT = 30


# ── Source max date fetchers ───────────────────────────────────────────

def fetch_arcgis_source_max(url: str, date_field: str) -> date | None:
    """Query ArcGIS for MAX(date_field) via outStatistics (cheap, no bulk fetch)."""
    params = {
        "where": "1=1",
        "outStatistics": (
            f'[{{"statisticType":"max","onStatisticField":"{date_field}",'
            f'"outStatisticFieldName":"max_date"}}]'
        ),
        "f": "json",
    }
    data = _request_with_retry(f"{url}/query", params)
    if not data:
        return None
    features = data.get("features", [])
    if not features:
        return None
    ts = features[0].get("attributes", {}).get("max_date")
    if ts is None:
        return None
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc).date()


def fetch_airnow_source_max() -> date | None:
    """
    Probe AirNow for the most recent available observation.

    AirNow historical endpoint publishes hourly observations with ~1-day
    lag. We probe today first, fall back to yesterday. Whichever returns
    data is the source_max.
    """
    api_key = os.environ.get("AIRNOW_API_KEY", "")
    if not api_key:
        logger.warning("AIRNOW_API_KEY not set — cannot determine AQI source freshness")
        return None

    today = datetime.now(tz=timezone.utc).date()
    for days_back in range(0, 3):
        probe_date = today - timedelta(days=days_back)
        params = {
            "format": "application/json",
            "latitude": 39.7392,
            "longitude": -104.9903,
            "distance": 25,
            "date": probe_date.strftime("%Y-%m-%dT00-0000"),
            "API_KEY": api_key,
        }
        try:
            resp = requests.get(AIRNOW_BASE_URL, params=params, timeout=AIRNOW_TIMEOUT)
            resp.raise_for_status()
            observations = resp.json()
        except requests.RequestException as e:
            logger.warning(f"AirNow probe for {probe_date} failed: {e}")
            continue

        # Any Denver observation is enough to confirm source freshness for this date.
        denver_hits = [
            o for o in observations
            if o.get("ReportingArea") in ("Denver", "Denver-Boulder")
        ]
        if denver_hits:
            return probe_date

    return None


# ── DB max date fetcher ────────────────────────────────────────────────

def fetch_db_max(conn, table: str, date_column: str) -> date | None:
    """SELECT MAX(date_column)::date FROM table."""
    with conn.cursor() as cur:
        cur.execute(f"SELECT MAX({date_column})::date FROM {table}")  # noqa: S608
        row = cur.fetchone()
    return row[0] if row and row[0] else None


# ── Classification ─────────────────────────────────────────────────────

def classify(source_max: date | None, db_max: date | None, today: date) -> tuple[str, int | None, int | None]:
    """
    Return (status, drift_days, source_age_days).

    drift_days = source_max - db_max (how far DB is behind source)
    source_age_days = today - source_max (how far source is behind real time)
    """
    if source_max is None or db_max is None:
        return "unknown", None, None

    drift = (source_max - db_max).days
    source_age = (today - source_max).days

    if drift > DRIFT_THRESHOLD_DAYS:
        return "pipeline_behind", drift, source_age
    if source_age > SOURCE_LAG_THRESHOLD_DAYS:
        return "source_lag", drift, source_age
    return "ok", drift, source_age


# ── Persist to DB ──────────────────────────────────────────────────────

def upsert_freshness(conn, rows: list[dict]) -> None:
    """Replace pipeline_source_freshness contents with the latest check results."""
    with conn.cursor() as cur:
        for r in rows:
            cur.execute(
                """
                INSERT INTO pipeline_source_freshness
                    (source, source_max_date, db_max_date, drift_days, status, source_age_days, checked_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (source) DO UPDATE SET
                    source_max_date = EXCLUDED.source_max_date,
                    db_max_date     = EXCLUDED.db_max_date,
                    drift_days      = EXCLUDED.drift_days,
                    status          = EXCLUDED.status,
                    source_age_days = EXCLUDED.source_age_days,
                    checked_at      = NOW()
                """,
                (
                    r["source"],
                    r["source_max_date"],
                    r["db_max_date"],
                    r["drift_days"],
                    r["status"],
                    r["source_age_days"],
                ),
            )
    conn.commit()


# ── Main ───────────────────────────────────────────────────────────────

def run_check() -> list[dict]:
    """Run the full freshness check and return per-source results."""
    today = datetime.now(tz=timezone.utc).date()
    results: list[dict] = []

    conn = get_connection()
    try:
        # ArcGIS sources
        for cfg in ARCGIS_SOURCES:
            src = cfg["source"]
            logger.info(f"  Checking {src}...")
            source_max = fetch_arcgis_source_max(cfg["url"], cfg["date_field"])
            db_max = fetch_db_max(conn, cfg["stg_table"], cfg["stg_date_column"])
            status, drift, age = classify(source_max, db_max, today)
            results.append({
                "source": src,
                "source_max_date": source_max,
                "db_max_date": db_max,
                "drift_days": drift,
                "source_age_days": age,
                "status": status,
            })

        # AQI (AirNow)
        logger.info("  Checking aqi...")
        source_max = fetch_airnow_source_max()
        db_max = fetch_db_max(conn, "stg_aqi", "observed_at")
        status, drift, age = classify(source_max, db_max, today)
        results.append({
            "source": "aqi",
            "source_max_date": source_max,
            "db_max_date": db_max,
            "drift_days": drift,
            "source_age_days": age,
            "status": status,
        })

        upsert_freshness(conn, results)
    finally:
        conn.close()

    return results


def format_report(results: list[dict]) -> str:
    """Human-readable summary for logs."""
    lines = ["", "FRESHNESS REPORT", "=" * 60]
    for r in results:
        icon = {
            "ok": "OK  ",
            "source_lag": "LAG ",
            "pipeline_behind": "FAIL",
            "unknown": "????",
        }.get(r["status"], "????")
        src = r["source"]
        src_d = r["source_max_date"].isoformat() if r["source_max_date"] else "n/a"
        db_d = r["db_max_date"].isoformat() if r["db_max_date"] else "n/a"
        drift = r["drift_days"]
        age = r["source_age_days"]
        lines.append(
            f"  [{icon}] {src:8s} source={src_d}  db={db_d}  "
            f"drift={drift if drift is not None else '?'}d  "
            f"source_age={age if age is not None else '?'}d"
        )
    return "\n".join(lines)


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [freshness] %(message)s",
    )
    logger.info("Running source freshness check")

    try:
        results = run_check()
    except Exception as e:
        logger.error(f"Freshness check failed: {e}", exc_info=True)
        return 1

    logger.info(format_report(results))

    behind = [r for r in results if r["status"] == "pipeline_behind"]
    if behind:
        names = ", ".join(r["source"] for r in behind)
        logger.error(
            f"PIPELINE BEHIND source for: {names}. "
            f"DB is more than {DRIFT_THRESHOLD_DAYS} days behind upstream."
        )
        return 1

    logger.info("All sources are in sync (or source-lagged — not our bug).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
