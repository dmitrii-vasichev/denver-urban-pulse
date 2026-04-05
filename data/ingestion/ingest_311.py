"""
Ingest 311 Service Requests from Denver Open Data directly into stg_311.

Source: ArcGIS Feature Service — ODC_service_requests_311 (Table 66)
Strategy: Fetch → transform → write to stg_311 (skipping raw table).
"""

import logging
from datetime import datetime, timedelta, timezone

from arcgis_client import fetch_all_records
from db import (
    bulk_insert,
    get_connection,
    load_neighborhood_map,
    resolve_neighborhood,
    truncate_table,
)

logger = logging.getLogger(__name__)

URL = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_service_requests_311/FeatureServer/66"

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


def _ts_to_dt(ts):
    if ts is None:
        return None
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
    return None


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


def transform_record(raw: dict, nbhd_map: dict[str, str]) -> dict | None:
    """Transform ArcGIS record directly to stg_311 format."""
    created = _ts_to_dt(raw.get("Case_Created_Date"))
    if created is None:
        return None

    fcr = raw.get("First_Call_Resolution")

    return {
        "case_summary": raw.get("Case_Summary"),
        "case_status": raw.get("Case_Status"),
        "case_source": raw.get("Case_Source"),
        "case_created_date": created,
        "case_closed_date": _parse_closed_date(raw.get("Case_Closed_dttm")),
        "first_call_resolution": fcr.lower().strip() == "yes" if fcr else False,
        "incident_address": raw.get("Incident_Address_1"),
        "zip_code": raw.get("Customer_Zip_Code"),
        "longitude": raw.get("Longitude"),
        "latitude": raw.get("Latitude"),
        "agency": raw.get("Agency"),
        "division": raw.get("Division"),
        "major_area": raw.get("Major_Area"),
        "request_type": raw.get("Type"),
        "topic": raw.get("Topic"),
        "council_district": raw.get("Council_District"),
        "police_district": raw.get("Police_District"),
        "neighborhood": resolve_neighborhood(raw.get("Neighborhood"), nbhd_map),
    }


def ingest(days_back: int = 90) -> dict:
    logger.info(f"Ingesting 311 data (last {days_back} days)")

    conn = get_connection()
    try:
        nbhd_map = load_neighborhood_map(conn)
    finally:
        conn.close()
    logger.info(f"  Loaded {len(nbhd_map)} neighborhood mappings")

    since = datetime.now(tz=timezone.utc) - timedelta(days=days_back)
    raw_records = fetch_all_records(
        URL,
        date_field="Case_Created_Date",
        since_date=since,
    )

    if not raw_records:
        logger.warning("No 311 records fetched")
        return {"source": "311", "status": "warning", "fetched": 0, "inserted": 0}

    logger.info(f"Fetched {len(raw_records)} raw 311 records from API")

    records = []
    for r in raw_records:
        rec = transform_record(r, nbhd_map)
        if rec is not None:
            records.append(rec)

    logger.info(f"Transformed: {len(records)} records (filtered from {len(raw_records)})")

    truncate_table("stg_311")
    inserted = bulk_insert("stg_311", records, STG_COLUMNS)
    logger.info(f"Inserted {inserted} 311 records into stg_311")

    return {"source": "311", "status": "ok", "fetched": len(raw_records), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"311 ingestion: {result}")
