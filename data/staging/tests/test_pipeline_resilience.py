"""
Regression tests for pipeline resilience fixes (issue #230).

Verifies that staging transforms handle:
- Duplicate records from ArcGIS pagination
- NULL values in required fields
- Correct conflict_columns for upsert
"""

import sys
import os
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

# Allow imports from parent staging directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Crime dedup & NULL guard ─────────────────────────────────────────

NBHD_MAP = {
    "capitol-hill": "Capitol Hill",
    "baker": "Baker",
}


def _make_crime_row(**overrides):
    row = {
        "incident_id": "2024-12345",
        "offense_id": "2024-12345-01",
        "offense_code": "5401",
        "offense_type_id": "theft-from-motor-vehicle",
        "offense_category_id": "larceny",
        "first_occurrence_date": datetime(2024, 6, 15, tzinfo=timezone.utc),
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


def _make_crash_row(**overrides):
    row = {
        "incident_id": "2024-99999",
        "offense_id": "2024-99999-01",
        "top_traffic_accident_offense": "TRAF - ACCIDENT - INJURY",
        "first_occurrence_date": datetime(2024, 6, 15, tzinfo=timezone.utc),
        "reported_date": datetime(2024, 6, 15, 14, 0, tzinfo=timezone.utc),
        "incident_address": "5TH AVE / BROADWAY",
        "geo_lon": -104.98,
        "geo_lat": 39.72,
        "district_id": "1",
        "precinct_id": "111",
        "neighborhood_id": "baker",
        "bicycle_ind": 0,
        "pedestrian_ind": 1,
        "seriously_injured": 1,
        "fatalities": 0,
        "road_condition": "DRY",
        "light_condition": "DAYLIGHT",
    }
    row.update(overrides)
    return row


class TestCrimeDedup:
    """Regression: duplicate records should be deduplicated before INSERT."""

    @patch("transform_crime.get_connection")
    @patch("transform_crime.fetch_raw_data")
    @patch("transform_crime.truncate_table")
    @patch("transform_crime.bulk_upsert", return_value=2)
    @patch("transform_crime.load_neighborhood_map", return_value=NBHD_MAP)
    def test_duplicate_records_deduplicated(
        self, mock_nbhd, mock_upsert, mock_trunc, mock_fetch, mock_conn
    ):
        from transform_crime import transform

        # Two identical records (same incident_id + offense_id)
        mock_fetch.return_value = [
            _make_crime_row(),
            _make_crime_row(),  # duplicate
            _make_crime_row(incident_id="2024-99999"),  # different
        ]
        mock_conn.return_value = MagicMock()

        result = transform()

        # bulk_upsert should receive only 2 deduplicated records
        call_args = mock_upsert.call_args
        records = call_args[0][1]
        assert len(records) == 2
        assert result["status"] == "ok"

    @patch("transform_crime.get_connection")
    @patch("transform_crime.fetch_raw_data")
    @patch("transform_crime.truncate_table")
    @patch("transform_crime.bulk_upsert", return_value=1)
    @patch("transform_crime.load_neighborhood_map", return_value=NBHD_MAP)
    def test_conflict_columns_passed(
        self, mock_nbhd, mock_upsert, mock_trunc, mock_fetch, mock_conn
    ):
        from transform_crime import transform

        mock_fetch.return_value = [_make_crime_row()]
        mock_conn.return_value = MagicMock()

        transform()

        call_kwargs = mock_upsert.call_args[1]
        assert call_kwargs["conflict_columns"] == ["incident_id", "offense_id"]


class TestCrimeNullGuard:
    """Regression: records with NULL required fields should be skipped."""

    @patch("transform_crime.get_connection")
    @patch("transform_crime.fetch_raw_data")
    @patch("transform_crime.truncate_table")
    @patch("transform_crime.bulk_upsert", return_value=1)
    @patch("transform_crime.load_neighborhood_map", return_value=NBHD_MAP)
    def test_null_incident_id_skipped(
        self, mock_nbhd, mock_upsert, mock_trunc, mock_fetch, mock_conn
    ):
        from transform_crime import transform

        mock_fetch.return_value = [
            _make_crime_row(incident_id=None),  # NULL — should be skipped
            _make_crime_row(incident_id="2024-11111"),  # valid
        ]
        mock_conn.return_value = MagicMock()

        result = transform()

        records = mock_upsert.call_args[0][1]
        assert len(records) == 1
        assert records[0]["incident_id"] == "2024-11111"

    @patch("transform_crime.get_connection")
    @patch("transform_crime.fetch_raw_data")
    @patch("transform_crime.truncate_table")
    @patch("transform_crime.bulk_upsert", return_value=1)
    @patch("transform_crime.load_neighborhood_map", return_value=NBHD_MAP)
    def test_null_reported_date_skipped(
        self, mock_nbhd, mock_upsert, mock_trunc, mock_fetch, mock_conn
    ):
        from transform_crime import transform

        mock_fetch.return_value = [
            _make_crime_row(reported_date=None),  # NULL — should be skipped
            _make_crime_row(),  # valid
        ]
        mock_conn.return_value = MagicMock()

        result = transform()

        records = mock_upsert.call_args[0][1]
        assert len(records) == 1


# ── Crashes dedup & NULL guard ───────────────────────────────────────


class TestCrashesDedup:
    """Regression: duplicate crash records should be deduplicated."""

    @patch("transform_crashes.get_connection")
    @patch("transform_crashes.fetch_raw_data")
    @patch("transform_crashes.truncate_table")
    @patch("transform_crashes.bulk_upsert", return_value=1)
    @patch("transform_crashes.load_neighborhood_map", return_value=NBHD_MAP)
    def test_duplicate_crashes_deduplicated(
        self, mock_nbhd, mock_upsert, mock_trunc, mock_fetch, mock_conn
    ):
        from transform_crashes import transform

        mock_fetch.return_value = [
            _make_crash_row(),
            _make_crash_row(),  # duplicate
        ]
        mock_conn.return_value = MagicMock()

        result = transform()

        records = mock_upsert.call_args[0][1]
        assert len(records) == 1

    @patch("transform_crashes.get_connection")
    @patch("transform_crashes.fetch_raw_data")
    @patch("transform_crashes.truncate_table")
    @patch("transform_crashes.bulk_upsert", return_value=1)
    @patch("transform_crashes.load_neighborhood_map", return_value=NBHD_MAP)
    def test_conflict_columns_passed(
        self, mock_nbhd, mock_upsert, mock_trunc, mock_fetch, mock_conn
    ):
        from transform_crashes import transform

        mock_fetch.return_value = [_make_crash_row()]
        mock_conn.return_value = MagicMock()

        transform()

        call_kwargs = mock_upsert.call_args[1]
        assert call_kwargs["conflict_columns"] == ["incident_id", "offense_id"]

    @patch("transform_crashes.get_connection")
    @patch("transform_crashes.fetch_raw_data")
    @patch("transform_crashes.truncate_table")
    @patch("transform_crashes.bulk_upsert", return_value=0)
    @patch("transform_crashes.load_neighborhood_map", return_value=NBHD_MAP)
    def test_null_incident_id_skipped(
        self, mock_nbhd, mock_upsert, mock_trunc, mock_fetch, mock_conn
    ):
        from transform_crashes import transform

        mock_fetch.return_value = [
            _make_crash_row(incident_id=None),
        ]
        mock_conn.return_value = MagicMock()

        result = transform()

        # All records skipped due to NULL incident_id → warning status
        assert result["status"] == "warning"


# ── Neighborhoods NULL guard ─────────────────────────────────────────


class TestNeighborhoodsNullGuard:
    """Regression: neighborhoods with NULL nbhd_id or nbhd_name should be skipped."""

    @patch("transform_neighborhoods.fetch_raw_data")
    @patch("transform_neighborhoods.truncate_table")
    @patch("transform_neighborhoods.bulk_upsert", return_value=1)
    def test_null_nbhd_id_skipped(self, mock_upsert, mock_trunc, mock_fetch):
        from transform_neighborhoods import transform

        mock_fetch.return_value = [
            {"nbhd_id": None, "nbhd_name": "Test", "typology": None,
             "geojson": None, "shape_area": 0, "shape_length": 0},
            {"nbhd_id": 1, "nbhd_name": "Valid", "typology": None,
             "geojson": None, "shape_area": 0, "shape_length": 0},
        ]

        result = transform()

        records = mock_upsert.call_args[0][1]
        assert len(records) == 1
        assert records[0]["nbhd_name"] == "Valid"

    @patch("transform_neighborhoods.fetch_raw_data")
    @patch("transform_neighborhoods.truncate_table")
    @patch("transform_neighborhoods.bulk_upsert", return_value=1)
    def test_conflict_columns_passed(self, mock_upsert, mock_trunc, mock_fetch):
        from transform_neighborhoods import transform

        mock_fetch.return_value = [
            {"nbhd_id": 1, "nbhd_name": "Valid", "typology": None,
             "geojson": None, "shape_area": 0, "shape_length": 0},
        ]

        transform()

        call_kwargs = mock_upsert.call_args[1]
        assert call_kwargs["conflict_columns"] == ["nbhd_id"]


# ── 311 NULL guard ───────────────────────────────────────────────────


class TestTransform311NullGuard:
    """Regression: 311 records with NULL case_created_date should be skipped."""

    @patch("transform_311.get_connection")
    @patch("transform_311.fetch_raw_data")
    @patch("transform_311.truncate_table")
    @patch("transform_311.bulk_upsert", return_value=1)
    @patch("transform_311.load_neighborhood_map", return_value=NBHD_MAP)
    def test_null_case_created_date_skipped(
        self, mock_nbhd, mock_upsert, mock_trunc, mock_fetch, mock_conn
    ):
        from transform_311 import transform

        mock_fetch.return_value = [
            {
                "case_summary": "Test", "case_status": "Open",
                "case_source": "Phone", "case_created_date": None,
                "case_closed_dttm": None, "first_call_resolution": "No",
                "incident_address_1": "123 Main", "customer_zip_code": "80202",
                "longitude": -104.9, "latitude": 39.7,
                "agency": "DPW", "division": "Streets", "major_area": "Streets",
                "type": "Pothole", "topic": "Roads",
                "council_district": 1, "police_district": 1,
                "neighborhood": "baker",
            },
            {
                "case_summary": "Valid", "case_status": "Open",
                "case_source": "Phone",
                "case_created_date": datetime(2024, 6, 15, tzinfo=timezone.utc),
                "case_closed_dttm": None, "first_call_resolution": "No",
                "incident_address_1": "456 Main", "customer_zip_code": "80202",
                "longitude": -104.9, "latitude": 39.7,
                "agency": "DPW", "division": "Streets", "major_area": "Streets",
                "type": "Pothole", "topic": "Roads",
                "council_district": 1, "police_district": 1,
                "neighborhood": "baker",
            },
        ]
        mock_conn.return_value = MagicMock()

        result = transform()

        records = mock_upsert.call_args[0][1]
        assert len(records) == 1
        assert records[0]["case_summary"] == "Valid"


# ── bulk_upsert error handling ───────────────────────────────────────


class TestBulkUpsertErrorHandling:
    """Regression: bulk_upsert should catch IntegrityError, not just OperationalError."""

    def test_integrity_error_in_except_clause(self):
        """Verify IntegrityError is listed in the except clause."""
        import inspect
        from db import bulk_upsert

        source = inspect.getsource(bulk_upsert)
        assert "IntegrityError" in source, (
            "bulk_upsert must catch psycopg2.IntegrityError to handle "
            "unique constraint violations gracefully"
        )


# ── Pipeline logging ─────────────────────────────────────────────────


class TestPipelineLogging:
    """Regression: pipeline should capture enough stderr lines for debugging."""

    def test_stderr_capture_at_least_50_lines(self):
        """Verify pipeline captures enough stderr lines."""
        pipeline_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "pipeline", "run_daily.py"
        )
        with open(pipeline_path) as f:
            source = f.read()

        # Should capture at least 50 lines (was 10 before fix)
        assert '[-50:]' in source, (
            "run_daily.py should capture last 50 lines of stderr, not 10"
        )
