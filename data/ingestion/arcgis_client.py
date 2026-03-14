"""
Shared ArcGIS REST API client with pagination support.

Handles the 2000-record-per-request limit by paginating via resultOffset.
"""

import logging
import time
from datetime import datetime, timezone

import requests

logger = logging.getLogger(__name__)

BATCH_SIZE = 2000
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds


def _get_oid_field(url: str) -> str:
    """Discover the objectIdField name from service metadata."""
    data = _request_with_retry(url, {"f": "json"})
    if data:
        oid = data.get("objectIdField")
        if oid:
            return oid
    return "OBJECTID"


def fetch_all_records(
    url: str,
    where: str = "1=1",
    out_fields: str = "*",
    date_field: str | None = None,
    since_date: datetime | None = None,
) -> list[dict]:
    """
    Fetch all records from an ArcGIS Feature Service layer with pagination.

    Args:
        url: Full layer URL (e.g., .../FeatureServer/324)
        where: SQL WHERE clause
        out_fields: Comma-separated field names or "*"
        date_field: Date field name for incremental fetching
        since_date: Only fetch records after this date (requires date_field)

    Returns:
        List of attribute dictionaries (one per record).
    """
    if since_date and date_field:
        where = f"{date_field} >= DATE '{since_date.strftime('%Y-%m-%d')}'"

    oid_field = _get_oid_field(url)
    all_records = []
    offset = 0

    while True:
        params = {
            "where": where,
            "outFields": out_fields,
            "resultOffset": offset,
            "resultRecordCount": BATCH_SIZE,
            "orderByFields": f"{oid_field} ASC",
            "f": "json",
        }

        data = _request_with_retry(f"{url}/query", params)
        if data is None:
            break

        features = data.get("features", [])
        if not features:
            break

        records = [f.get("attributes", {}) for f in features]
        all_records.extend(records)

        logger.info(f"  Fetched {len(records)} records (total: {len(all_records)}, offset: {offset})")

        if len(features) < BATCH_SIZE:
            break  # Last page

        offset += BATCH_SIZE

    return all_records


def fetch_geojson(url: str, where: str = "1=1", out_fields: str = "*") -> dict | None:
    """Fetch records as GeoJSON (for geometry data like neighborhoods)."""
    params = {
        "where": where,
        "outFields": out_fields,
        "f": "geojson",
    }
    return _request_with_retry(f"{url}/query", params)


def _request_with_retry(url: str, params: dict) -> dict | None:
    """Make a GET request with retry logic."""
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, params=params, timeout=60)
            resp.raise_for_status()
            data = resp.json()

            if "error" in data:
                logger.error(f"API error: {data['error']}")
                return None

            return data

        except requests.RequestException as e:
            logger.warning(f"Request failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))

    logger.error(f"All {MAX_RETRIES} attempts failed for {url}")
    return None
