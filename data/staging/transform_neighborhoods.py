"""
Staging transformation: raw_neighborhoods → stg_neighborhoods.

Cleans neighborhood boundary data:
- Parses geojson TEXT → JSONB
- Maps fields directly (nbhd_id, nbhd_name, typology, shape_area, shape_length)

Strategy: Full refresh (truncate + reload).
"""

import json
import logging
import time

from db import bulk_upsert, fetch_raw_data, truncate_table

logger = logging.getLogger(__name__)

STG_COLUMNS = [
    "nbhd_id",
    "nbhd_name",
    "typology",
    "geojson",
    "shape_area",
    "shape_length",
]

RAW_QUERY = """
    SELECT nbhd_id, nbhd_name, typology, geojson, shape_area, shape_length
    FROM raw_neighborhoods
"""


def transform_record(raw: dict) -> dict:
    """Transform a raw_neighborhoods row into a stg_neighborhoods record."""
    geojson_str = raw.get("geojson")
    if geojson_str:
        try:
            geojson_parsed = json.loads(geojson_str)
            geojson_out = json.dumps(geojson_parsed)
        except (json.JSONDecodeError, TypeError):
            geojson_out = None
    else:
        geojson_out = None

    return {
        "nbhd_id": raw["nbhd_id"],
        "nbhd_name": raw["nbhd_name"],
        "typology": raw.get("typology"),
        "geojson": geojson_out,
        "shape_area": raw.get("shape_area"),
        "shape_length": raw.get("shape_length"),
    }


def transform(dry_run: bool = False) -> dict:
    """Run the neighborhoods staging transformation."""
    start = time.time()
    logger.info("Starting neighborhoods staging transformation")

    raw_rows = fetch_raw_data(RAW_QUERY)
    logger.info(f"  Fetched {len(raw_rows)} raw neighborhood records")

    if not raw_rows:
        return {
            "source": "stg_neighborhoods",
            "status": "warning",
            "fetched": 0,
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

    # Transform, skip records with NULL required fields
    all_records = [transform_record(r) for r in raw_rows]
    records = [r for r in all_records if r["nbhd_id"] is not None and r["nbhd_name"] is not None]
    if len(records) < len(all_records):
        logger.warning(f"  Skipped {len(all_records) - len(records)} records with NULL nbhd_id/nbhd_name")

    if dry_run:
        return {
            "source": "stg_neighborhoods",
            "status": "dry_run",
            "fetched": len(raw_rows),
            "transformed": len(records),
            "duration_s": round(time.time() - start, 1),
        }

    truncate_table("stg_neighborhoods")
    inserted = bulk_upsert(
        "stg_neighborhoods", records, STG_COLUMNS,
        conflict_columns=["nbhd_id"],
    )

    duration = round(time.time() - start, 1)
    logger.info(f"  Neighborhoods staging complete: {inserted} rows in {duration}s")

    return {
        "source": "stg_neighborhoods",
        "status": "ok",
        "fetched": len(raw_rows),
        "inserted": inserted,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = transform()
    print(f"Neighborhoods staging: {result}")
