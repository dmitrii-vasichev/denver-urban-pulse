"""
Ingest traffic accident data from Denver Open Data into raw_crashes table.

Source: ArcGIS Feature Service — ODC_CRIME_TRAFFICACCIDENTS5YR_P (Layer 325)
Strategy: Full refresh — truncate and reload recent data (last 90 days).
"""

import logging
from datetime import datetime, timedelta, timezone

from arcgis_client import fetch_all_records
from db import bulk_insert, truncate_table

logger = logging.getLogger(__name__)

URL = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_CRIME_TRAFFICACCIDENTS5YR_P/FeatureServer/325"

COLUMN_MAP = {
    "incident_id": "incident_id",
    "offense_id": "offense_id",
    "offense_code": "offense_code",
    "offense_code_extension": "offense_code_extension",
    "top_traffic_accident_offense": "top_traffic_accident_offense",
    "first_occurrence_date": "first_occurrence_date",
    "last_occurrence_date": "last_occurrence_date",
    "reported_date": "reported_date",
    "incident_address": "incident_address",
    "geo_x": "geo_x",
    "geo_y": "geo_y",
    "geo_lon": "geo_lon",
    "geo_lat": "geo_lat",
    "district_id": "district_id",
    "precinct_id": "precinct_id",
    "neighborhood_id": "neighborhood_id",
    "bicycle_ind": "bicycle_ind",
    "pedestrian_ind": "pedestrian_ind",
    "HARMFUL_EVENT_SEQ_1": "harmful_event_seq_1",
    "HARMFUL_EVENT_SEQ_2": "harmful_event_seq_2",
    "HARMFUL_EVENT_SEQ_3": "harmful_event_seq_3",
    "road_location": "road_location",
    "ROAD_DESCRIPTION": "road_description",
    "ROAD_CONTOUR": "road_contour",
    "ROAD_CONDITION": "road_condition",
    "LIGHT_CONDITION": "light_condition",
    "TU1_VEHICLE_TYPE": "tu1_vehicle_type",
    "TU1_TRAVEL_DIRECTION": "tu1_travel_direction",
    "TU1_VEHICLE_MOVEMENT": "tu1_vehicle_movement",
    "TU1_DRIVER_ACTION": "tu1_driver_action",
    "TU1_DRIVER_HUMANCONTRIBFACTOR": "tu1_driver_humancontribfactor",
    "TU1_PEDESTRIAN_ACTION": "tu1_pedestrian_action",
    "TU2_VEHICLE_TYPE": "tu2_vehicle_type",
    "TU2_TRAVEL_DIRECTION": "tu2_travel_direction",
    "TU2_VEHICLE_MOVEMENT": "tu2_vehicle_movement",
    "TU2_DRIVER_ACTION": "tu2_driver_action",
    "TU2_DRIVER_HUMANCONTRIBFACTOR": "tu2_driver_humancontribfactor",
    "TU2_PEDESTRIAN_ACTION": "tu2_pedestrian_action",
    "SERIOUSLY_INJURED": "seriously_injured",
    "FATALITIES": "fatalities",
    "FATALITY_MODE_1": "fatality_mode_1",
    "FATALITY_MODE_2": "fatality_mode_2",
    "SERIOUSLY_INJURED_MODE_1": "seriously_injured_mode_1",
    "SERIOUSLY_INJURED_MODE_2": "seriously_injured_mode_2",
    "POINT_X": "point_x",
    "POINT_Y": "point_y",
}

DB_COLUMNS = list(COLUMN_MAP.values())
DATE_FIELDS = {"first_occurrence_date", "last_occurrence_date", "reported_date"}


def _ts_to_dt(ts):
    if ts is None:
        return None
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)


def transform_record(raw: dict) -> dict:
    record = {}
    for src, dst in COLUMN_MAP.items():
        val = raw.get(src)
        if dst in DATE_FIELDS:
            val = _ts_to_dt(val)
        record[dst] = val
    return record


def ingest(days_back: int = 90) -> dict:
    logger.info(f"Ingesting crash data (last {days_back} days)")

    since = datetime.now(tz=timezone.utc) - timedelta(days=days_back)
    records = fetch_all_records(
        URL,
        date_field="reported_date",
        since_date=since,
    )

    if not records:
        logger.warning("No crash records fetched")
        return {"source": "crashes", "status": "warning", "fetched": 0, "inserted": 0}

    transformed = [transform_record(r) for r in records]
    logger.info(f"Fetched {len(transformed)} crash records")

    truncate_table("raw_crashes")
    inserted = bulk_insert("raw_crashes", transformed, DB_COLUMNS)
    logger.info(f"Inserted {inserted} crash records")

    return {"source": "crashes", "status": "ok", "fetched": len(records), "inserted": inserted}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    result = ingest()
    print(f"Crashes ingestion: {result}")
