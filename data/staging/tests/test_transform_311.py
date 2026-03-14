"""Tests for 311 staging transformation logic."""

import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from transform_311 import transform_record, _parse_closed_date


NBHD_MAP = {
    "capitol hill": "Capitol Hill",
    "five points": "Five Points",
    "baker": "Baker",
}


def _make_raw_row(**overrides):
    row = {
        "case_summary": "Pothole repair request",
        "case_status": "Closed",
        "case_source": "Phone",
        "case_created_date": datetime(2024, 6, 15, 10, 0, tzinfo=timezone.utc),
        "case_closed_dttm": "06/16/2024 02:30:00 PM",
        "first_call_resolution": "Yes",
        "incident_address_1": "1234 E COLFAX AVE",
        "customer_zip_code": "80218",
        "longitude": -104.95,
        "latitude": 39.74,
        "agency": "DOTI",
        "division": "Street Maintenance",
        "major_area": "Pothole",
        "type": "Pothole - Repair",
        "topic": "Streets & Roads",
        "council_district": 10,
        "police_district": 3,
        "neighborhood": "Capitol Hill",
    }
    row.update(overrides)
    return row


class TestParseClosedDate:
    def test_us_format(self):
        result = _parse_closed_date("06/16/2024 02:30:00 PM")
        assert result == datetime(2024, 6, 16, 14, 30, 0)

    def test_iso_format(self):
        result = _parse_closed_date("2024-06-16 14:30:00")
        assert result == datetime(2024, 6, 16, 14, 30, 0)

    def test_none(self):
        assert _parse_closed_date(None) is None

    def test_empty_string(self):
        assert _parse_closed_date("") is None

    def test_invalid_format(self):
        assert _parse_closed_date("not-a-date") is None


class TestTransform311Record:
    def test_request_type_mapping(self):
        raw = _make_raw_row(type="Pothole - Repair")
        result = transform_record(raw, NBHD_MAP)
        assert result["request_type"] == "Pothole - Repair"

    def test_incident_address_mapping(self):
        raw = _make_raw_row(incident_address_1="999 BROADWAY")
        result = transform_record(raw, NBHD_MAP)
        assert result["incident_address"] == "999 BROADWAY"

    def test_zip_code_mapping(self):
        raw = _make_raw_row(customer_zip_code="80202")
        result = transform_record(raw, NBHD_MAP)
        assert result["zip_code"] == "80202"

    def test_first_call_resolution_yes(self):
        raw = _make_raw_row(first_call_resolution="Yes")
        result = transform_record(raw, NBHD_MAP)
        assert result["first_call_resolution"] is True

    def test_first_call_resolution_no(self):
        raw = _make_raw_row(first_call_resolution="No")
        result = transform_record(raw, NBHD_MAP)
        assert result["first_call_resolution"] is False

    def test_first_call_resolution_none(self):
        raw = _make_raw_row(first_call_resolution=None)
        result = transform_record(raw, NBHD_MAP)
        assert result["first_call_resolution"] is False

    def test_closed_date_parsed(self):
        raw = _make_raw_row(case_closed_dttm="06/16/2024 02:30:00 PM")
        result = transform_record(raw, NBHD_MAP)
        assert result["case_closed_date"] == datetime(2024, 6, 16, 14, 30, 0)

    def test_neighborhood_normalized(self):
        raw = _make_raw_row(neighborhood="Capitol Hill")
        result = transform_record(raw, NBHD_MAP)
        assert result["neighborhood"] == "Capitol Hill"

    def test_neighborhood_unknown(self):
        raw = _make_raw_row(neighborhood="Unknown Place")
        result = transform_record(raw, NBHD_MAP)
        assert result["neighborhood"] is None

    def test_all_stg_columns_present(self):
        from transform_311 import STG_COLUMNS
        raw = _make_raw_row()
        result = transform_record(raw, NBHD_MAP)
        for col in STG_COLUMNS:
            assert col in result, f"Missing column: {col}"
