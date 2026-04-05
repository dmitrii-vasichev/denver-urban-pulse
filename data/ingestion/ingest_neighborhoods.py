"""
Ingest neighborhood boundaries from Denver Open Data.

Writes to both raw_neighborhoods (for ref_neighborhoods sync)
and stg_neighborhoods (for frontend queries and marts).

Source: ArcGIS Feature Service — ODC_ADMN_NEIGHBORHOOD_A (Layer 13)
Strategy: Full refresh (static dataset, updated rarely).
"""

import json
import logging

from arcgis_client import fetch_geojson
from db import bulk_insert, truncate_table

logger = logging.getLogger(__name__)

URL = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_ADMN_NEIGHBORHOOD_A/FeatureServer/13"

RAW_COLUMNS = [
    "nbhd_id", "nbhd_name", "typology", "notes",
    "geojson", "shape_area", "shape_length",
]

STG_COLUMNS = [
    "nbhd_id", "nbhd_name", "typology",
    "geojson", "shape_area", "shape_length",
]


def ingest() -> dict:
    logger.info("Ingesting neighborhood boundaries")

    geojson_data = fetch_geojson(URL)
    if not geojson_data:
        logger.warning("No neighborhood data fetched")
        return {"source": "neighborhoods", "status": "warning", "fetched": 0, "inserted": 0}

    features = geojson_data.get("features", [])
    if not features:
        logger.warning("No features in GeoJSON response")
        return {"source": "neighborhoods", "status": "warning", "fetched": 0, "inserted": 0}

    raw_records = []
    stg_records = []
    for f in features:
        props = f.get("properties", {})
        geom = f.get("geometry", {})
        geojson_str = json.dumps(geom)

        nbhd_id = props.get("NBHD_ID")
        nbhd_name = props.get("NBHD_NAME")
        if nbhd_id is None or nbhd_name is None:
            continue

        raw_records.append({
            "nbhd_id": nbhd_id,
            "nbhd_name": nbhd_name,
            "typology": props.get("TYPOLOGY"),
            "notes": props.get("NOTES"),
            "geojson": geojson_str,
            "shape_area": props.get("Shape__Area"),
            "shape_length": props.get("Shape__Length"),
        })

        stg_records.append({
            "nbhd_id": nbhd_id,
            "nbhd_name": nbhd_name,
            "typology": props.get("TYPOLOGY"),
            "geojson": geojson_str,
            "shape_area": props.get("Shape__Area"),
            "shape_length": props.get("Shape__Length"),
        })

    logger.info(f"Fetched {len(raw_records)} neighborhoods")

    # Write to raw_neighborhoods (for ref_neighborhoods sync)
    truncate_table("raw_neighborhoods")
    bulk_insert("raw_neighborhoods", raw_records, RAW_COLUMNS)

    # Write to stg_neighborhoods (for frontend and marts)
    truncate_table("stg_neighborhoods")
    inserted = bulk_insert(
        "stg_neighborhoods", stg_records, STG_COLUMNS,
        conflict_columns=["nbhd_id"],
    )
    logger.info(f"Inserted {inserted} neighborhoods into raw + stg")

    return {"source": "neighborhoods", "status": "ok", "fetched": len(features), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"Neighborhoods ingestion: {result}")
