"""
Staging transformation: raw_crime → stg_crime.

Cleans and normalizes crime data:
- Maps field names (offense_type_id → offense_type, etc.)
- Resolves neighborhood_id to canonical name via ref_neighborhoods
- Casts victim_count from DOUBLE to INTEGER
- Filters out traffic offenses (is_crime = 0)
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

RAW_QUERY = """
    SELECT incident_id, offense_id, offense_code,
           offense_type_id, offense_category_id,
           first_occurrence_date, reported_date,
           incident_address,
           geo_lon, geo_lat,
           district_id, precinct_id, neighborhood_id,
           is_crime, victim_count
    FROM raw_crime
    WHERE reported_date IS NOT NULL
      AND is_crime = 1
"""


def transform_record(raw: dict, nbhd_map: dict[str, str]) -> dict:
    """Transform a raw_crime row into a stg_crime record."""
    return {
        "incident_id": raw["incident_id"],
        "offense_id": raw["offense_id"],
        "offense_code": raw["offense_code"],
        "offense_type": raw["offense_type_id"],
        "offense_category": raw["offense_category_id"],
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
        "victim_count": int(raw["victim_count"]) if raw["victim_count"] is not None else 0,
    }


def transform(dry_run: bool = False) -> dict:
    """
    Run the crime staging transformation.

    Returns dict with status, counts, and timing.
    """
    start = time.time()
    logger.info("Starting crime staging transformation")

    # Load neighborhood mapping
    conn = get_connection()
    try:
        nbhd_map = load_neighborhood_map(conn)
    finally:
        conn.close()
    logger.info(f"  Loaded {len(nbhd_map)} neighborhood mappings")

    # Fetch raw data (already filtered: is_crime=1, reported_date NOT NULL)
    raw_rows = fetch_raw_data(RAW_QUERY)
    logger.info(f"  Fetched {len(raw_rows)} raw crime records")

    if not raw_rows:
        return {
            "source": "stg_crime",
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
            "source": "stg_crime",
            "status": "dry_run",
            "fetched": len(raw_rows),
            "transformed": len(records),
            "unresolved_neighborhoods": unresolved,
            "duration_s": round(time.time() - start, 1),
        }

    # Load: truncate + insert
    truncate_table("stg_crime")
    inserted = bulk_upsert("stg_crime", records, STG_COLUMNS)

    duration = round(time.time() - start, 1)
    logger.info(f"  Crime staging complete: {inserted} rows in {duration}s")

    return {
        "source": "stg_crime",
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
    print(f"Crime staging: {result}")
