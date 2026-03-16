"""Tests for AQI staging transformation logic."""

import sys
import os
from datetime import date, datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from transform_aqi import transform_record, _build_observed_at, RAW_QUERY


def _make_raw_row(**overrides):
    row = {
        "date_observed": "2024-06-15",
        "hour_observed": 14,
        "local_time_zone": "MDT",
        "reporting_area": "Denver",
        "parameter_name": "OZONE",
        "aqi": 42,
        "category_name": "Good",
        "latitude": 39.7392,
        "longitude": -104.9903,
    }
    row.update(overrides)
    return row


class TestBuildObservedAt:
    def test_mdt_timezone(self):
        result = _build_observed_at("2024-06-15", 14, "MDT")
        assert result is not None
        assert result.hour == 14
        assert result.utcoffset() == timedelta(hours=-6)

    def test_mst_timezone(self):
        result = _build_observed_at("2024-01-15", 10, "MST")
        assert result is not None
        assert result.utcoffset() == timedelta(hours=-7)

    def test_none_date(self):
        assert _build_observed_at(None, 14, "MDT") is None

    def test_empty_date(self):
        assert _build_observed_at("", 14, "MDT") is None

    def test_bad_date_format(self):
        assert _build_observed_at("not-a-date", 14, "MDT") is None

    def test_none_hour_defaults_to_zero(self):
        result = _build_observed_at("2024-06-15", None, "MDT")
        assert result is not None
        assert result.hour == 0

    def test_unknown_tz_defaults_mst(self):
        result = _build_observed_at("2024-06-15", 10, "XYZ")
        assert result is not None
        assert result.utcoffset() == timedelta(hours=-7)

    def test_trailing_space_in_date(self):
        result = _build_observed_at("2024-06-15 ", 10, "MDT")
        assert result is not None
        assert result.day == 15

    def test_date_object_input(self):
        result = _build_observed_at(date(2026, 3, 15), 14, "MST")
        assert result is not None
        assert result.year == 2026
        assert result.month == 3
        assert result.day == 15
        assert result.hour == 14

    def test_datetime_object_input(self):
        result = _build_observed_at(datetime(2026, 3, 15, 0, 0), 10, "MDT")
        assert result is not None
        assert result.day == 15
        assert result.hour == 10


class TestTransformAqiRecord:
    def test_basic_transform(self):
        raw = _make_raw_row()
        result = transform_record(raw)
        assert result is not None
        assert result["reporting_area"] == "Denver"
        assert result["parameter_name"] == "OZONE"
        assert result["aqi"] == 42
        assert result["category"] == "Good"

    def test_observed_at_set(self):
        raw = _make_raw_row()
        result = transform_record(raw)
        assert result["observed_at"] is not None
        assert result["observed_at"].year == 2024

    def test_aqi_cast_to_int(self):
        raw = _make_raw_row(aqi=55.0)
        result = transform_record(raw)
        assert result["aqi"] == 55
        assert isinstance(result["aqi"], int)

    def test_none_aqi_returns_none(self):
        raw = _make_raw_row(aqi=None)
        result = transform_record(raw)
        assert result is None

    def test_bad_date_returns_none(self):
        raw = _make_raw_row(date_observed=None)
        result = transform_record(raw)
        assert result is None

    def test_denver_boulder_reporting_area(self):
        raw = _make_raw_row(reporting_area="Denver-Boulder")
        result = transform_record(raw)
        assert result is not None
        assert result["reporting_area"] == "Denver-Boulder"

    def test_all_stg_columns_present(self):
        from transform_aqi import STG_COLUMNS
        raw = _make_raw_row()
        result = transform_record(raw)
        assert result is not None
        for col in STG_COLUMNS:
            assert col in result, f"Missing column: {col}"


class TestRawQuery:
    def test_accepts_denver(self):
        assert "'Denver'" in RAW_QUERY

    def test_accepts_denver_boulder(self):
        assert "'Denver-Boulder'" in RAW_QUERY
