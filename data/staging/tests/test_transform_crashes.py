"""Tests for crashes staging transformation logic."""

import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from transform_crashes import transform_record


NBHD_MAP = {
    "five-points": "Five Points",
    "five points": "Five Points",
    "cbd": "CBD",
    "baker": "Baker",
    "highland": "Highland",
}


def _make_raw_row(**overrides):
    """Build a raw_crashes row dict with sensible defaults."""
    row = {
        "incident_id": "2024-99001",
        "offense_id": "2024-99001-01",
        "top_traffic_accident_offense": "IMPROPER LANE CHANGE",
        "first_occurrence_date": datetime(2024, 7, 10, 8, 0, tzinfo=timezone.utc),
        "reported_date": datetime(2024, 7, 10, 8, 15, tzinfo=timezone.utc),
        "incident_address": "I25 HWYNB / W 6TH AVE",
        "geo_lon": -105.0,
        "geo_lat": 39.73,
        "district_id": "1",
        "precinct_id": "112",
        "neighborhood_id": "baker",
        "bicycle_ind": 0,
        "pedestrian_ind": 0,
        "seriously_injured": 1,
        "fatalities": 0,
        "road_condition": "DRY",
        "light_condition": "DAYLIGHT",
    }
    row.update(overrides)
    return row


class TestTransformCrashesRecord:
    """Unit tests for transform_record()."""

    def test_basic_field_mapping(self):
        raw = _make_raw_row()
        result = transform_record(raw, NBHD_MAP)

        assert result["incident_id"] == "2024-99001"
        assert result["top_offense"] == "IMPROPER LANE CHANGE"

    def test_coordinate_mapping(self):
        raw = _make_raw_row(geo_lon=-105.0, geo_lat=39.73)
        result = transform_record(raw, NBHD_MAP)
        assert result["longitude"] == -105.0
        assert result["latitude"] == 39.73

    def test_neighborhood_resolved(self):
        raw = _make_raw_row(neighborhood_id="baker")
        result = transform_record(raw, NBHD_MAP)
        assert result["neighborhood"] == "Baker"

    def test_neighborhood_unknown_returns_none(self):
        raw = _make_raw_row(neighborhood_id="nowhere")
        result = transform_record(raw, NBHD_MAP)
        assert result["neighborhood"] is None

    def test_bicycle_ind_true(self):
        raw = _make_raw_row(bicycle_ind=1)
        result = transform_record(raw, NBHD_MAP)
        assert result["bicycle_involved"] is True

    def test_bicycle_ind_false(self):
        raw = _make_raw_row(bicycle_ind=0)
        result = transform_record(raw, NBHD_MAP)
        assert result["bicycle_involved"] is False

    def test_bicycle_ind_none(self):
        raw = _make_raw_row(bicycle_ind=None)
        result = transform_record(raw, NBHD_MAP)
        assert result["bicycle_involved"] is False

    def test_pedestrian_ind_true(self):
        raw = _make_raw_row(pedestrian_ind=1)
        result = transform_record(raw, NBHD_MAP)
        assert result["pedestrian_involved"] is True

    def test_seriously_injured_coalesce_null(self):
        raw = _make_raw_row(seriously_injured=None)
        result = transform_record(raw, NBHD_MAP)
        assert result["seriously_injured"] == 0

    def test_fatalities_coalesce_null(self):
        raw = _make_raw_row(fatalities=None)
        result = transform_record(raw, NBHD_MAP)
        assert result["fatalities"] == 0

    def test_seriously_injured_preserves_value(self):
        raw = _make_raw_row(seriously_injured=3)
        result = transform_record(raw, NBHD_MAP)
        assert result["seriously_injured"] == 3

    def test_road_and_light_condition(self):
        raw = _make_raw_row(road_condition="WET", light_condition="DARK")
        result = transform_record(raw, NBHD_MAP)
        assert result["road_condition"] == "WET"
        assert result["light_condition"] == "DARK"

    def test_all_stg_columns_present(self):
        from transform_crashes import STG_COLUMNS

        raw = _make_raw_row()
        result = transform_record(raw, NBHD_MAP)
        for col in STG_COLUMNS:
            assert col in result, f"Missing column: {col}"
