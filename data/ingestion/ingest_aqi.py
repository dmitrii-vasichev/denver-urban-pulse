"""
Ingest AQI data from AirNow API directly into stg_aqi.

Source: AirNow REST API — historical observations for Denver metro.
Strategy: Fetch → transform → upsert to stg_aqi (skipping raw table).
"""

import logging
import os
from datetime import datetime, timedelta, timezone

import requests

from db import bulk_insert

logger = logging.getLogger(__name__)

API_KEY = os.environ.get("AIRNOW_API_KEY", "")
BASE_URL = "https://www.airnowapi.org/aq/observation/latLong/historical/"
DENVER_LAT = 39.7392
DENVER_LON = -104.9903
TIMEOUT = 30

TZ_OFFSETS = {
    "MST": -7,
    "MDT": -6,
    "MT": -7,
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


def _build_observed_at(date_val, hour, tz_abbr) -> datetime | None:
    """Combine date + hour + timezone into a TIMESTAMPTZ value."""
    if not date_val:
        return None
    try:
        if isinstance(date_val, datetime):
            dt = datetime(date_val.year, date_val.month, date_val.day)
        else:
            dt = datetime.strptime(str(date_val).strip(), "%Y-%m-%d")
    except (ValueError, AttributeError):
        return None

    h = int(hour) if hour is not None else 0
    offset_hours = TZ_OFFSETS.get(tz_abbr, -7)
    tz = timezone(timedelta(hours=offset_hours))
    return dt.replace(hour=h, tzinfo=tz)


def fetch_day(date: datetime) -> list[dict]:
    """Fetch AQI observations for a single day."""
    date_str = date.strftime("%Y-%m-%dT00-0000")
    params = {
        "format": "application/json",
        "latitude": DENVER_LAT,
        "longitude": DENVER_LON,
        "distance": 25,
        "date": date_str,
        "API_KEY": API_KEY,
    }
    try:
        resp = requests.get(BASE_URL, params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.warning(f"Failed to fetch AQI for {date.strftime('%Y-%m-%d')}: {e}")
        return []


def transform_record(raw: dict) -> dict | None:
    """Transform AirNow response directly to stg_aqi format."""
    reporting_area = raw.get("ReportingArea", "")
    if reporting_area not in ("Denver", "Denver-Boulder"):
        return None

    observed_at = _build_observed_at(
        raw.get("DateObserved"),
        raw.get("HourObserved"),
        raw.get("LocalTimeZone"),
    )
    if observed_at is None:
        return None

    aqi_val = raw.get("AQI")
    if aqi_val is None:
        return None

    return {
        "observed_at": observed_at,
        "reporting_area": reporting_area,
        "parameter_name": raw.get("ParameterName"),
        "aqi": int(aqi_val),
        "category": raw.get("Category", {}).get("Name", "Unknown"),
        "latitude": raw.get("Latitude"),
        "longitude": raw.get("Longitude"),
    }


def ingest(days_back: int = 90) -> dict:
    if not API_KEY:
        logger.error("AIRNOW_API_KEY not set")
        return {"source": "aqi", "status": "error", "fetched": 0, "inserted": 0}

    logger.info(f"Ingesting AQI data (last {days_back} days)")

    all_records = []
    now = datetime.now(tz=timezone.utc)

    for i in range(days_back):
        date = now - timedelta(days=i)
        observations = fetch_day(date)
        for obs in observations:
            rec = transform_record(obs)
            if rec:
                all_records.append(rec)

        if (i + 1) % 10 == 0:
            logger.info(f"  Fetched {i + 1}/{days_back} days ({len(all_records)} records)")

    if not all_records:
        logger.warning("No AQI records fetched")
        return {"source": "aqi", "status": "warning", "fetched": 0, "inserted": 0}

    logger.info(f"Fetched {len(all_records)} AQI records total")

    inserted = bulk_insert(
        "stg_aqi", all_records, STG_COLUMNS,
        conflict_columns=CONFLICT_COLUMNS,
    )
    logger.info(f"Inserted {inserted} AQI records into stg_aqi")

    return {"source": "aqi", "status": "ok", "fetched": len(all_records), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"AQI ingestion: {result}")
