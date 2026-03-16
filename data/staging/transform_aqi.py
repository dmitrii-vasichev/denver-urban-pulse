"""
Staging transformation: raw_aqi → stg_aqi.

Cleans and normalizes AQI data:
- Combines date_observed + hour_observed + local_time_zone → observed_at TIMESTAMPTZ
- Maps category_name → category
- Filters to Denver reporting area only
- Uses ON CONFLICT (observed_at, reporting_area, parameter_name) DO UPDATE

Strategy: Upsert (not truncate) to preserve historical data.
"""

import logging
import time
from datetime import date, datetime, timedelta, timezone

from db import bulk_upsert, fetch_raw_data

logger = logging.getLogger(__name__)

# IANA timezone offsets for common AirNow local_time_zone values
TZ_OFFSETS = {
    "MST": -7,
    "MDT": -6,
    "MT": -7,   # fallback for Mountain Time
}

STG_COLUMNS = [
    "observed_at",
    "reporting_area",
    "parameter_name",
    "aqi",
    "category",
    "latitude",
    "longitude",
]

CONFLICT_COLUMNS = ["observed_at", "reporting_area", "parameter_name"]

RAW_QUERY = """
    SELECT date_observed, hour_observed, local_time_zone,
           reporting_area, parameter_name, aqi, category_name,
           latitude, longitude
    FROM raw_aqi
    WHERE reporting_area IN ('Denver', 'Denver-Boulder')
"""


def _build_observed_at(
    date_val: str | date | None,
    hour: int | None,
    tz_abbr: str | None,
) -> datetime | None:
    """Combine date + hour + timezone into a TIMESTAMPTZ value."""
    if not date_val:
        return None

    try:
        if isinstance(date_val, (date, datetime)):
            dt = datetime(date_val.year, date_val.month, date_val.day)
        else:
            # AirNow date format: "2024-06-15 " (with trailing space sometimes)
            dt = datetime.strptime(date_val.strip(), "%Y-%m-%d")
    except (ValueError, AttributeError):
        return None

    h = int(hour) if hour is not None else 0
    offset_hours = TZ_OFFSETS.get(tz_abbr, -7)  # default MST
    tz = timezone(timedelta(hours=offset_hours))
    return dt.replace(hour=h, tzinfo=tz)


def transform_record(raw: dict) -> dict | None:
    """Transform a raw_aqi row into a stg_aqi record."""
    observed_at = _build_observed_at(
        raw.get("date_observed"),
        raw.get("hour_observed"),
        raw.get("local_time_zone"),
    )
    if observed_at is None:
        return None

    aqi_val = raw.get("aqi")
    if aqi_val is None:
        return None

    return {
        "observed_at": observed_at,
        "reporting_area": raw["reporting_area"],
        "parameter_name": raw["parameter_name"],
        "aqi": int(aqi_val),
        "category": raw.get("category_name", "Unknown"),
        "latitude": raw.get("latitude"),
        "longitude": raw.get("longitude"),
    }


def transform(dry_run: bool = False) -> dict:
    """Run the AQI staging transformation."""
    start = time.time()
    logger.info("Starting AQI staging transformation")

    raw_rows = fetch_raw_data(RAW_QUERY)
    logger.info(f"  Fetched {len(raw_rows)} raw AQI records (Denver only)")

    if not raw_rows:
        return {
            "source": "stg_aqi",
            "status": "warning",
            "fetched": 0,
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

    records = []
    skipped = 0
    for row in raw_rows:
        rec = transform_record(row)
        if rec:
            records.append(rec)
        else:
            skipped += 1

    if skipped:
        logger.warning(f"  Skipped {skipped} records (bad date or missing AQI)")

    if dry_run:
        return {
            "source": "stg_aqi",
            "status": "dry_run",
            "fetched": len(raw_rows),
            "transformed": len(records),
            "skipped": skipped,
            "duration_s": round(time.time() - start, 1),
        }

    # Upsert (ON CONFLICT DO UPDATE) — preserves existing data
    inserted = bulk_upsert(
        "stg_aqi", records, STG_COLUMNS, conflict_columns=CONFLICT_COLUMNS
    )

    duration = round(time.time() - start, 1)
    logger.info(f"  AQI staging complete: {inserted} rows in {duration}s")

    return {
        "source": "stg_aqi",
        "status": "ok",
        "fetched": len(raw_rows),
        "inserted": inserted,
        "skipped": skipped,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = transform()
    print(f"AQI staging: {result}")
