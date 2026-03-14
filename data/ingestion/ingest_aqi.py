"""
Ingest AQI data from AirNow API into raw_aqi table.

Source: AirNow REST API — historical observations for Denver metro.
Strategy: Fetch last 90 days of daily observations, full refresh.
"""

import logging
import os
import sys
from datetime import datetime, timedelta, timezone

import requests

from db import bulk_insert, truncate_table

logger = logging.getLogger(__name__)

API_KEY = os.environ.get("AIRNOW_API_KEY", "")
BASE_URL = "https://www.airnowapi.org/aq/observation/latLong/historical/"
DENVER_LAT = 39.7392
DENVER_LON = -104.9903
TIMEOUT = 30


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


def transform_record(raw: dict) -> dict:
    """Map AirNow response to raw_aqi columns."""
    return {
        "date_observed": raw.get("DateObserved"),
        "hour_observed": raw.get("HourObserved"),
        "local_time_zone": raw.get("LocalTimeZone"),
        "reporting_area": raw.get("ReportingArea"),
        "state_code": raw.get("StateCode"),
        "latitude": raw.get("Latitude"),
        "longitude": raw.get("Longitude"),
        "parameter_name": raw.get("ParameterName"),
        "aqi": raw.get("AQI"),
        "category_number": raw.get("Category", {}).get("Number"),
        "category_name": raw.get("Category", {}).get("Name"),
    }


DB_COLUMNS = [
    "date_observed", "hour_observed", "local_time_zone", "reporting_area",
    "state_code", "latitude", "longitude", "parameter_name", "aqi",
    "category_number", "category_name",
]


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
            all_records.append(transform_record(obs))

        if (i + 1) % 10 == 0:
            logger.info(f"  Fetched {i + 1}/{days_back} days ({len(all_records)} records)")

    if not all_records:
        logger.warning("No AQI records fetched")
        return {"source": "aqi", "status": "warning", "fetched": 0, "inserted": 0}

    logger.info(f"Fetched {len(all_records)} AQI records total")

    truncate_table("raw_aqi")
    inserted = bulk_insert("raw_aqi", all_records, DB_COLUMNS)
    logger.info(f"Inserted {inserted} AQI records")

    return {"source": "aqi", "status": "ok", "fetched": len(all_records), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"AQI ingestion: {result}")
