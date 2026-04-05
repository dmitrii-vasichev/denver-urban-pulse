"""
Ingest crime data from Denver Open Data directly into stg_crime.

Source: ArcGIS Feature Service — ODC_CRIME_OFFENSES_P (Layer 324)
Strategy: Fetch → transform → write to stg_crime (skipping raw table).
"""

import logging
from datetime import datetime, timedelta, timezone

from arcgis_client import fetch_all_records
from db import (
    bulk_insert,
    get_connection,
    load_neighborhood_map,
    truncate_table,
)

logger = logging.getLogger(__name__)

URL = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_CRIME_OFFENSES_P/FeatureServer/324"

STG_COLUMNS = [
    "incident_id",
    "offense_id",
    "offense_code",
    "offense_type",
    "offense_category",
    "first_occurrence_date",
    "reported_date",
    "incident_address",
    "longitude",
    "latitude",
    "district_id",
    "precinct_id",
    "neighborhood",
    "victim_count",
]


def _ts_to_dt(ts):
    if ts is None:
        return None
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)


def transform_record(raw: dict, nbhd_map: dict[str, str]) -> dict | None:
    """Transform ArcGIS record directly to stg_crime format."""
    reported = _ts_to_dt(raw.get("REPORTED_DATE"))
    if reported is None:
        return None

    # Filter: only crimes (not traffic offenses)
    if raw.get("IS_CRIME") != 1:
        return None

    nbhd_id = raw.get("NEIGHBORHOOD_ID") or ""
    victim = raw.get("VICTIM_COUNT")

    return {
        "incident_id": raw.get("INCIDENT_ID"),
        "offense_id": raw.get("OFFENSE_ID"),
        "offense_code": raw.get("OFFENSE_CODE"),
        "offense_type": raw.get("OFFENSE_TYPE_ID"),
        "offense_category": raw.get("OFFENSE_CATEGORY_ID"),
        "first_occurrence_date": _ts_to_dt(raw.get("FIRST_OCCURRENCE_DATE")),
        "reported_date": reported,
        "incident_address": raw.get("INCIDENT_ADDRESS"),
        "longitude": raw.get("GEO_LON"),
        "latitude": raw.get("GEO_LAT"),
        "district_id": raw.get("DISTRICT_ID"),
        "precinct_id": raw.get("PRECINCT_ID"),
        "neighborhood": nbhd_map.get(nbhd_id.lower().strip()),
        "victim_count": int(victim) if victim is not None else 0,
    }


def ingest(days_back: int = 90) -> dict:
    logger.info(f"Ingesting crime data (last {days_back} days)")

    # Load neighborhood mapping
    conn = get_connection()
    try:
        nbhd_map = load_neighborhood_map(conn)
    finally:
        conn.close()
    logger.info(f"  Loaded {len(nbhd_map)} neighborhood mappings")

    since = datetime.now(tz=timezone.utc) - timedelta(days=days_back)
    raw_records = fetch_all_records(
        URL,
        date_field="REPORTED_DATE",
        since_date=since,
    )

    if not raw_records:
        logger.warning("No crime records fetched")
        return {"source": "crime", "status": "warning", "fetched": 0, "inserted": 0}

    logger.info(f"Fetched {len(raw_records)} raw crime records from API")

    # Transform + filter + dedup
    seen = set()
    records = []
    for r in raw_records:
        rec = transform_record(r, nbhd_map)
        if rec is None or rec["incident_id"] is None:
            continue
        key = (rec["incident_id"], rec["offense_id"])
        if key not in seen:
            seen.add(key)
            records.append(rec)

    logger.info(f"Transformed: {len(records)} records (filtered from {len(raw_records)})")

    truncate_table("stg_crime")
    inserted = bulk_insert(
        "stg_crime", records, STG_COLUMNS,
        conflict_columns=["incident_id", "offense_id"],
    )
    logger.info(f"Inserted {inserted} crime records into stg_crime")

    return {"source": "crime", "status": "ok", "fetched": len(raw_records), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"Crime ingestion: {result}")
