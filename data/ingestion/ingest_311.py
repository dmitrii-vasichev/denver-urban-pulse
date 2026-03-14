"""
Ingest 311 Service Requests from Denver Open Data into raw_311 table.

Source: ArcGIS Feature Service — ODC_service_requests_311 (Table 66, rolling 12 months)
Strategy: Full refresh of the rolling dataset.
"""

import logging
from datetime import datetime, timedelta, timezone

from arcgis_client import fetch_all_records
from db import bulk_insert, truncate_table

logger = logging.getLogger(__name__)

URL = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_service_requests_311/FeatureServer/66"

COLUMN_MAP = {
    "Case_Summary": "case_summary",
    "Case_Status": "case_status",
    "Case_Source": "case_source",
    "Case_Created_Date": "case_created_date",
    "Case_Created_dttm": "case_created_dttm",
    "Case_Closed_Date": "case_closed_date",
    "Case_Closed_dttm": "case_closed_dttm",
    "First_Call_Resolution": "first_call_resolution",
    "Customer_Zip_Code": "customer_zip_code",
    "Incident_Address_1": "incident_address_1",
    "Incident_Address_2": "incident_address_2",
    "Incident_Intersection_1": "incident_intersection_1",
    "Incident_Intersection_2": "incident_intersection_2",
    "Incident_Zip_Code": "incident_zip_code",
    "Longitude": "longitude",
    "Latitude": "latitude",
    "Agency": "agency",
    "Division": "division",
    "Major_Area": "major_area",
    "Type": "type",
    "Topic": "topic",
    "Council_District": "council_district",
    "Police_District": "police_district",
    "Neighborhood": "neighborhood",
}

DB_COLUMNS = list(COLUMN_MAP.values())
DATE_FIELDS = {"case_created_date", "case_closed_date"}


def _ts_to_dt(ts):
    if ts is None:
        return None
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
    return None  # String dates stay as-is in raw table


def transform_record(raw: dict) -> dict:
    record = {}
    for src, dst in COLUMN_MAP.items():
        val = raw.get(src)
        if dst in DATE_FIELDS and isinstance(val, (int, float)):
            val = _ts_to_dt(val)
        record[dst] = val
    return record


def ingest(days_back: int = 90) -> dict:
    logger.info(f"Ingesting 311 data (last {days_back} days)")

    since = datetime.now(tz=timezone.utc) - timedelta(days=days_back)
    records = fetch_all_records(
        URL,
        date_field="Case_Created_Date",
        since_date=since,
    )

    if not records:
        logger.warning("No 311 records fetched")
        return {"source": "311", "status": "warning", "fetched": 0, "inserted": 0}

    transformed = [transform_record(r) for r in records]
    logger.info(f"Fetched {len(transformed)} 311 records")

    truncate_table("raw_311")
    inserted = bulk_insert("raw_311", transformed, DB_COLUMNS)
    logger.info(f"Inserted {inserted} 311 records")

    return {"source": "311", "status": "ok", "fetched": len(records), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"311 ingestion: {result}")
