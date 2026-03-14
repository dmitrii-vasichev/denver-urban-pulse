"""Tests for crime staging transformation logic."""

import sys
import os
from datetime import datetime, timezone

# Allow imports from parent staging directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from transform_crime import transform_record


# Shared neighborhood map for tests
NBHD_MAP = {
    "capitol-hill": "Capitol Hill",
    "capitol hill": "Capitol Hill",
    "five-points": "Five Points",
    "five points": "Five Points",
    "cbd": "CBD",
    "baker": "Baker",
}


def _make_raw_row(**overrides):
    """Build a raw_crime row dict with sensible defaults."""
    row = {
        "incident_id": "2024-12345",
        "offense_id": "2024-12345-01",
        "offense_code": "5401",
        "offense_type_id": "theft-from-motor-vehicle",
        "offense_category_id": "larceny",
        "first_occurrence_date": datetime(2024, 6, 15, 10, 30, tzinfo=timezone.utc),
        "reported_date": datetime(2024, 6, 15, 14, 0, tzinfo=timezone.utc),
        "incident_address": "1234 E COLFAX AVE",
        "geo_lon": -104.95,
        "geo_lat": 39.74,
        "district_id": "3",
        "precinct_id": "311",
        "neighborhood_id": "capitol-hill",
        "is_crime": 1,
        "victim_count": 1.0,
    }
    row.update(overrides)
    return row


class TestTransformCrimeRecord:
    """Unit tests for transform_record()."""

    def test_basic_field_mapping(self):
        raw = _make_raw_row()
        result = transform_record(raw, NBHD_MAP)

        assert result["incident_id"] == "2024-12345"
        assert result["offense_id"] == "2024-12345-01"
        assert result["offense_code"] == "5401"
        assert result["offense_type"] == "theft-from-motor-vehicle"
        assert result["offense_category"] == "larceny"

    def test_coordinate_mapping(self):
        raw = _make_raw_row(geo_lon=-104.95, geo_lat=39.74)
        result = transform_record(raw, NBHD_MAP)

        assert result["longitude"] == -104.95
        assert result["latitude"] == 39.74

    def test_neighborhood_resolved(self):
        raw = _make_raw_row(neighborhood_id="capitol-hill")
        result = transform_record(raw, NBHD_MAP)
        assert result["neighborhood"] == "Capitol Hill"

    def test_neighborhood_case_insensitive(self):
        raw = _make_raw_row(neighborhood_id="Capitol-Hill")
        result = transform_record(raw, NBHD_MAP)
        assert result["neighborhood"] == "Capitol Hill"

    def test_neighborhood_unknown_returns_none(self):
        raw = _make_raw_row(neighborhood_id="unknown-place")
        result = transform_record(raw, NBHD_MAP)
        assert result["neighborhood"] is None

    def test_neighborhood_none_returns_none(self):
        raw = _make_raw_row(neighborhood_id=None)
        result = transform_record(raw, NBHD_MAP)
        assert result["neighborhood"] is None

    def test_victim_count_cast_to_int(self):
        raw = _make_raw_row(victim_count=3.0)
        result = transform_record(raw, NBHD_MAP)
        assert result["victim_count"] == 3
        assert isinstance(result["victim_count"], int)

    def test_victim_count_none_defaults_to_zero(self):
        raw = _make_raw_row(victim_count=None)
        result = transform_record(raw, NBHD_MAP)
        assert result["victim_count"] == 0

    def test_dates_preserved(self):
        dt = datetime(2024, 6, 15, 10, 30, tzinfo=timezone.utc)
        raw = _make_raw_row(first_occurrence_date=dt, reported_date=dt)
        result = transform_record(raw, NBHD_MAP)
        assert result["first_occurrence_date"] == dt
        assert result["reported_date"] == dt

    def test_all_stg_columns_present(self):
        from transform_crime import STG_COLUMNS

        raw = _make_raw_row()
        result = transform_record(raw, NBHD_MAP)
        for col in STG_COLUMNS:
            assert col in result, f"Missing column: {col}"
