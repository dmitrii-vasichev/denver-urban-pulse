"""
Staging transformation: raw_crashes → stg_crashes.

Cleans and normalizes crash data:
- Maps top_traffic_accident_offense → top_offense
- Maps geo_lon/geo_lat → longitude/latitude
- Resolves neighborhood_id to canonical name via ref_neighborhoods
- Converts bicycle_ind/pedestrian_ind (0/1) → boolean
- Coalesces seriously_injured/fatalities NULLs to 0
- Drops records with NULL reported_date

Strategy: Full refresh (truncate + reload).
"""

import logging
import time

from db import (
    bulk_upsert,
    fetch_raw_data,
    get_connection,
    load_neighborhood_map,
    truncate_table,
)

logger = logging.getLogger(__name__)

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

RAW_QUERY = """
    SELECT incident_id, offense_id,
           top_traffic_accident_offense,
           first_occurrence_date, reported_date,
           incident_address,
           geo_lon, geo_lat,
           district_id, precinct_id, neighborhood_id,
           bicycle_ind, pedestrian_ind,
           seriously_injured, fatalities,
           road_condition, light_condition
    FROM raw_crashes
    WHERE reported_date IS NOT NULL
"""


def transform_record(raw: dict, nbhd_map: dict[str, str]) -> dict:
    """Transform a raw_crashes row into a stg_crashes record."""
    return {
        "incident_id": raw["incident_id"],
        "offense_id": raw["offense_id"],
        "top_offense": raw["top_traffic_accident_offense"],
        "first_occurrence_date": raw["first_occurrence_date"],
        "reported_date": raw["reported_date"],
        "incident_address": raw["incident_address"],
        "longitude": raw["geo_lon"],
        "latitude": raw["geo_lat"],
        "district_id": raw["district_id"],
        "precinct_id": raw["precinct_id"],
        "neighborhood": nbhd_map.get(
            (raw["neighborhood_id"] or "").lower().strip()
        ),
        "bicycle_involved": bool(raw["bicycle_ind"]) if raw["bicycle_ind"] is not None else False,
        "pedestrian_involved": bool(raw["pedestrian_ind"]) if raw["pedestrian_ind"] is not None else False,
        "seriously_injured": raw["seriously_injured"] if raw["seriously_injured"] is not None else 0,
        "fatalities": raw["fatalities"] if raw["fatalities"] is not None else 0,
        "road_condition": raw["road_condition"],
        "light_condition": raw["light_condition"],
    }


def transform(dry_run: bool = False) -> dict:
    """
    Run the crashes staging transformation.

    Returns dict with status, counts, and timing.
    """
    start = time.time()
    logger.info("Starting crashes staging transformation")

    # Load neighborhood mapping
    conn = get_connection()
    try:
        nbhd_map = load_neighborhood_map(conn)
    finally:
        conn.close()
    logger.info(f"  Loaded {len(nbhd_map)} neighborhood mappings")

    # Fetch raw data (filtered: reported_date NOT NULL)
    raw_rows = fetch_raw_data(RAW_QUERY)
    logger.info(f"  Fetched {len(raw_rows)} raw crash records")

    if not raw_rows:
        return {
            "source": "stg_crashes",
            "status": "warning",
            "fetched": 0,
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

    # Transform
    records = [transform_record(r, nbhd_map) for r in raw_rows]

    # Count unresolved neighborhoods
    unresolved = sum(1 for r in records if r["neighborhood"] is None)
    if unresolved:
        logger.warning(f"  {unresolved} records with unresolved neighborhood")

    if dry_run:
        logger.info("  Dry run — skipping insert")
        return {
            "source": "stg_crashes",
            "status": "dry_run",
            "fetched": len(raw_rows),
            "transformed": len(records),
            "unresolved_neighborhoods": unresolved,
            "duration_s": round(time.time() - start, 1),
        }

    # Load: truncate + insert
    truncate_table("stg_crashes")
    inserted = bulk_upsert("stg_crashes", records, STG_COLUMNS)

    duration = round(time.time() - start, 1)
    logger.info(f"  Crashes staging complete: {inserted} rows in {duration}s")

    return {
        "source": "stg_crashes",
        "status": "ok",
        "fetched": len(raw_rows),
        "inserted": inserted,
        "unresolved_neighborhoods": unresolved,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = transform()
    print(f"Crashes staging: {result}")
