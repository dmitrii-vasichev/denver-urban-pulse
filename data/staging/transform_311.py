"""
Staging transformation: raw_311 → stg_311.

Cleans and normalizes 311 service request data:
- Maps type → request_type, incident_address_1 → incident_address
- Maps customer_zip_code → zip_code
- Parses case_closed_dttm string to TIMESTAMPTZ
- Converts first_call_resolution ("Yes"/"No") → boolean
- Normalizes neighborhood via ref_neighborhoods
- Drops records with NULL case_created_date

Strategy: Full refresh (truncate + reload).
"""

import logging
import time
from datetime import datetime

from db import (
    bulk_upsert,
    fetch_raw_data,
    get_connection,
    load_neighborhood_map,
    resolve_neighborhood,
    truncate_table,
)

logger = logging.getLogger(__name__)

STG_COLUMNS = [
    "case_summary",
    "case_status",
    "case_source",
    "case_created_date",
    "case_closed_date",
    "first_call_resolution",
    "incident_address",
    "zip_code",
    "longitude",
    "latitude",
    "agency",
    "division",
    "major_area",
    "request_type",
    "topic",
    "council_district",
    "police_district",
    "neighborhood",
]

RAW_QUERY = """
    SELECT case_summary, case_status, case_source,
           case_created_date, case_closed_dttm,
           first_call_resolution,
           incident_address_1, customer_zip_code,
           longitude, latitude,
           agency, division, major_area, type, topic,
           council_district, police_district,
           neighborhood
    FROM raw_311
    WHERE case_created_date IS NOT NULL
"""


def _parse_closed_date(dttm_str: str | None) -> datetime | None:
    """Parse case_closed_dttm string to datetime."""
    if not dttm_str:
        return None
    for fmt in ("%m/%d/%Y %I:%M:%S %p", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M"):
        try:
            return datetime.strptime(dttm_str.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return None


def transform_record(raw: dict, nbhd_map: dict[str, str]) -> dict:
    """Transform a raw_311 row into a stg_311 record."""
    fcr = raw.get("first_call_resolution")
    return {
        "case_summary": raw["case_summary"],
        "case_status": raw["case_status"],
        "case_source": raw["case_source"],
        "case_created_date": raw["case_created_date"],
        "case_closed_date": _parse_closed_date(raw.get("case_closed_dttm")),
        "first_call_resolution": fcr.lower().strip() == "yes" if fcr else False,
        "incident_address": raw.get("incident_address_1"),
        "zip_code": raw.get("customer_zip_code"),
        "longitude": raw["longitude"],
        "latitude": raw["latitude"],
        "agency": raw["agency"],
        "division": raw["division"],
        "major_area": raw["major_area"],
        "request_type": raw.get("type"),
        "topic": raw["topic"],
        "council_district": raw.get("council_district"),
        "police_district": raw.get("police_district"),
        "neighborhood": resolve_neighborhood(raw.get("neighborhood"), nbhd_map),
    }


def transform(dry_run: bool = False) -> dict:
    """Run the 311 staging transformation."""
    start = time.time()
    logger.info("Starting 311 staging transformation")

    conn = get_connection()
    try:
        nbhd_map = load_neighborhood_map(conn)
    finally:
        conn.close()
    logger.info(f"  Loaded {len(nbhd_map)} neighborhood mappings")

    raw_rows = fetch_raw_data(RAW_QUERY)
    logger.info(f"  Fetched {len(raw_rows)} raw 311 records")

    if not raw_rows:
        return {
            "source": "stg_311",
            "status": "warning",
            "fetched": 0,
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

    # Transform, skip records with NULL required fields
    records = []
    skipped_null = 0
    for r in raw_rows:
        rec = transform_record(r, nbhd_map)
        if rec["case_created_date"] is None:
            skipped_null += 1
            continue
        records.append(rec)
    if skipped_null:
        logger.warning(f"  Skipped {skipped_null} records with NULL case_created_date")

    if not records:
        return {
            "source": "stg_311",
            "status": "warning",
            "fetched": len(raw_rows),
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

    unresolved = sum(1 for r in records if r["neighborhood"] is None)
    if unresolved:
        logger.warning(f"  {unresolved} records with unresolved neighborhood")

    if dry_run:
        return {
            "source": "stg_311",
            "status": "dry_run",
            "fetched": len(raw_rows),
            "transformed": len(records),
            "unresolved_neighborhoods": unresolved,
            "duration_s": round(time.time() - start, 1),
        }

    truncate_table("stg_311")
    inserted = bulk_upsert("stg_311", records, STG_COLUMNS)

    duration = round(time.time() - start, 1)
    logger.info(f"  311 staging complete: {inserted} rows in {duration}s")

    return {
        "source": "stg_311",
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
    print(f"311 staging: {result}")
