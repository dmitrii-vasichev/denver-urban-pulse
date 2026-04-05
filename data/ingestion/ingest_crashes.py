"""
Ingest traffic crash data from Denver Open Data directly into stg_crashes.

Source: ArcGIS Feature Service — ODC_CRIME_TRAFFICACCIDENTS5YR_P (Layer 325)
Strategy: Fetch → transform → write to stg_crashes (skipping raw table).
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

URL = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_CRIME_TRAFFICACCIDENTS5YR_P/FeatureServer/325"

STG_COLUMNS = [
    "incident_id",
    "offense_id",
    "top_offense",
    "first_occurrence_date",
    "reported_date",
    "incident_address",
    "longitude",
    "latitude",
    "district_id",
    "precinct_id",
    "neighborhood",
    "bicycle_involved",
    "pedestrian_involved",
    "seriously_injured",
    "fatalities",
    "road_condition",
    "light_condition",
]


def _ts_to_dt(ts):
    if ts is None:
        return None
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)


def transform_record(raw: dict, nbhd_map: dict[str, str]) -> dict | None:
    """Transform ArcGIS record directly to stg_crashes format."""
    reported = _ts_to_dt(raw.get("reported_date"))
    if reported is None:
        return None

    nbhd_id = raw.get("neighborhood_id") or ""
    bicycle = raw.get("bicycle_ind")
    pedestrian = raw.get("pedestrian_ind")

    return {
        "incident_id": raw.get("incident_id"),
        "offense_id": raw.get("offense_id"),
        "top_offense": raw.get("top_traffic_accident_offense"),
        "first_occurrence_date": _ts_to_dt(raw.get("first_occurrence_date")),
        "reported_date": reported,
        "incident_address": raw.get("incident_address"),
        "longitude": raw.get("geo_lon"),
        "latitude": raw.get("geo_lat"),
        "district_id": raw.get("district_id"),
        "precinct_id": raw.get("precinct_id"),
        "neighborhood": nbhd_map.get(nbhd_id.lower().strip()),
        "bicycle_involved": bool(bicycle) if bicycle is not None else False,
        "pedestrian_involved": bool(pedestrian) if pedestrian is not None else False,
        "seriously_injured": raw.get("SERIOUSLY_INJURED") or 0,
        "fatalities": raw.get("FATALITIES") or 0,
        "road_condition": raw.get("ROAD_CONDITION"),
        "light_condition": raw.get("LIGHT_CONDITION"),
    }


def ingest(days_back: int = 90) -> dict:
    logger.info(f"Ingesting crash data (last {days_back} days)")

    conn = get_connection()
    try:
        nbhd_map = load_neighborhood_map(conn)
    finally:
        conn.close()
    logger.info(f"  Loaded {len(nbhd_map)} neighborhood mappings")

    since = datetime.now(tz=timezone.utc) - timedelta(days=days_back)
    raw_records = fetch_all_records(
        URL,
        date_field="reported_date",
        since_date=since,
    )

    if not raw_records:
        logger.warning("No crash records fetched")
        return {"source": "crashes", "status": "warning", "fetched": 0, "inserted": 0}

    logger.info(f"Fetched {len(raw_records)} raw crash records from API")

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

    truncate_table("stg_crashes")
    inserted = bulk_insert(
        "stg_crashes", records, STG_COLUMNS,
        conflict_columns=["incident_id", "offense_id"],
    )
    logger.info(f"Inserted {inserted} crash records into stg_crashes")

    return {"source": "crashes", "status": "ok", "fetched": len(raw_records), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"Crashes ingestion: {result}")
