"""
Ingest crime data from Denver Open Data into raw_crime table.

Source: ArcGIS Feature Service — ODC_CRIME_OFFENSES_P (Layer 324)
Strategy: Full refresh — truncate and reload recent data (last 90 days).
"""

import logging
from datetime import datetime, timedelta, timezone

from arcgis_client import fetch_all_records
from db import bulk_insert, truncate_table

logger = logging.getLogger(__name__)

URL = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_CRIME_OFFENSES_P/FeatureServer/324"

COLUMN_MAP = {
    "INCIDENT_ID": "incident_id",
    "OFFENSE_ID": "offense_id",
    "OFFENSE_CODE": "offense_code",
    "OFFENSE_CODE_EXTENSION": "offense_code_extension",
    "OFFENSE_TYPE_ID": "offense_type_id",
    "OFFENSE_CATEGORY_ID": "offense_category_id",
    "FIRST_OCCURRENCE_DATE": "first_occurrence_date",
    "LAST_OCCURRENCE_DATE": "last_occurrence_date",
    "REPORTED_DATE": "reported_date",
    "INCIDENT_ADDRESS": "incident_address",
    "GEO_X": "geo_x",
    "GEO_Y": "geo_y",
    "GEO_LON": "geo_lon",
    "GEO_LAT": "geo_lat",
    "DISTRICT_ID": "district_id",
    "PRECINCT_ID": "precinct_id",
    "NEIGHBORHOOD_ID": "neighborhood_id",
    "IS_CRIME": "is_crime",
    "IS_TRAFFIC": "is_traffic",
    "VICTIM_COUNT": "victim_count",
}

DB_COLUMNS = list(COLUMN_MAP.values())
DATE_FIELDS = {"first_occurrence_date", "last_occurrence_date", "reported_date"}


def _ts_to_dt(ts):
    """Convert ArcGIS millisecond timestamp to datetime or None."""
    if ts is None:
        return None
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)


def transform_record(raw: dict) -> dict:
    """Map ArcGIS field names to database columns and convert types."""
    record = {}
    for src, dst in COLUMN_MAP.items():
        val = raw.get(src)
        if dst in DATE_FIELDS:
            val = _ts_to_dt(val)
        record[dst] = val
    return record


def ingest(days_back: int = 90) -> dict:
    """
    Fetch and store crime data.

    Returns dict with status and counts.
    """
    logger.info(f"Ingesting crime data (last {days_back} days)")

    since = datetime.now(tz=timezone.utc) - timedelta(days=days_back)
    records = fetch_all_records(
        URL,
        date_field="REPORTED_DATE",
        since_date=since,
    )

    if not records:
        logger.warning("No crime records fetched")
        return {"source": "crime", "status": "warning", "fetched": 0, "inserted": 0}

    transformed = [transform_record(r) for r in records]
    logger.info(f"Fetched {len(transformed)} crime records")

    truncate_table("raw_crime")
    inserted = bulk_insert("raw_crime", transformed, DB_COLUMNS)
    logger.info(f"Inserted {inserted} crime records")

    return {"source": "crime", "status": "ok", "fetched": len(records), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"Crime ingestion: {result}")
