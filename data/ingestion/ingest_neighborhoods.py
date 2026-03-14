"""
Ingest neighborhood boundaries from Denver Open Data into raw_neighborhoods.

Source: ArcGIS Feature Service — ODC_ADMN_NEIGHBORHOOD_A (Layer 13)
Strategy: Full refresh (static dataset, updated rarely).
"""

import json
import logging

from arcgis_client import fetch_geojson
from db import bulk_insert, truncate_table

logger = logging.getLogger(__name__)

URL = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_ADMN_NEIGHBORHOOD_A/FeatureServer/13"

DB_COLUMNS = [
    "nbhd_id", "nbhd_name", "typology", "notes",
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

    records = []
    for f in features:
        props = f.get("properties", {})
        geom = f.get("geometry", {})
        records.append({
            "nbhd_id": props.get("NBHD_ID"),
            "nbhd_name": props.get("NBHD_NAME"),
            "typology": props.get("TYPOLOGY"),
            "notes": props.get("NOTES"),
            "geojson": json.dumps(geom),
            "shape_area": props.get("Shape__Area"),
            "shape_length": props.get("Shape__Length"),
        })

    logger.info(f"Fetched {len(records)} neighborhoods")

    truncate_table("raw_neighborhoods")
    inserted = bulk_insert("raw_neighborhoods", records, DB_COLUMNS)
    logger.info(f"Inserted {inserted} neighborhoods")

    return {"source": "neighborhoods", "status": "ok", "fetched": len(records), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"Neighborhoods ingestion: {result}")
