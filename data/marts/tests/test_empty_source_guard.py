"""Tests for empty-source guard in all mart builders.

Each mart builder must return status="skipped" when its source tables are empty,
preserving existing mart data instead of truncating it.
"""

import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "staging"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _make_count_rows(empty_tables: set[str]):
    """Return a count_rows mock that returns 0 for specified tables."""
    def mock_count_rows(table: str) -> int:
        return 0 if table in empty_tables else 100
    return mock_count_rows


class TestAqiDailyGuard:
    """build_aqi_daily must skip when stg_aqi is empty."""

    @patch("build_aqi_daily.truncate_table")
    @patch("build_aqi_daily.count_rows", return_value=0)
    def test_skips_when_stg_aqi_empty(self, mock_count, mock_truncate):
        from build_aqi_daily import build
        result = build()
        assert result["status"] == "skipped"
        mock_truncate.assert_not_called()

    @patch("build_aqi_daily.execute_sql", return_value=90)
    @patch("build_aqi_daily.truncate_table")
    @patch("build_aqi_daily.count_rows", return_value=500)
    def test_builds_when_stg_aqi_has_data(self, mock_count, mock_truncate, mock_exec):
        from build_aqi_daily import build
        result = build()
        assert result["status"] == "ok"
        mock_truncate.assert_called_once_with("mart_aqi_daily")


class TestCityPulseDailyGuard:
    """build_city_pulse_daily must skip when all staging tables are empty."""

    @patch("build_city_pulse_daily.truncate_table")
    @patch("build_city_pulse_daily.count_rows", return_value=0)
    def test_skips_when_all_staging_empty(self, mock_count, mock_truncate):
        from build_city_pulse_daily import build
        result = build()
        assert result["status"] == "skipped"
        mock_truncate.assert_not_called()

    @patch("build_city_pulse_daily.execute_sql", return_value=30)
    @patch("build_city_pulse_daily.truncate_table")
    @patch("build_city_pulse_daily.count_rows", side_effect=_make_count_rows({"stg_crashes"}))
    def test_builds_when_at_least_one_has_data(self, mock_count, mock_truncate, mock_exec):
        from build_city_pulse_daily import build
        result = build()
        assert result["status"] == "ok"
        mock_truncate.assert_called_once()


class TestIncidentTrendsGuard:
    @patch("build_incident_trends.truncate_table")
    @patch("build_incident_trends.count_rows", return_value=0)
    def test_skips_when_all_staging_empty(self, mock_count, mock_truncate):
        from build_incident_trends import build
        result = build()
        assert result["status"] == "skipped"
        mock_truncate.assert_not_called()


class TestHeatmapGuard:
    @patch("build_heatmap.truncate_table")
    @patch("build_heatmap.count_rows", return_value=0)
    def test_skips_when_all_staging_empty(self, mock_count, mock_truncate):
        from build_heatmap import build
        result = build()
        assert result["status"] == "skipped"
        mock_truncate.assert_not_called()


class TestNeighborhoodRankingGuard:
    @patch("build_neighborhood_ranking.truncate_table")
    @patch("build_neighborhood_ranking.count_rows", return_value=0)
    def test_skips_when_all_staging_empty(self, mock_count, mock_truncate):
        from build_neighborhood_ranking import build
        result = build()
        assert result["status"] == "skipped"
        mock_truncate.assert_not_called()


class TestCategoryBreakdownGuard:
    @patch("build_category_breakdown.truncate_table")
    @patch("build_category_breakdown.count_rows", return_value=0)
    def test_skips_when_all_staging_empty(self, mock_count, mock_truncate):
        from build_category_breakdown import build
        result = build()
        assert result["status"] == "skipped"
        mock_truncate.assert_not_called()


class TestCityPulseNeighborhoodGuard:
    @patch("build_city_pulse_neighborhood.truncate_table")
    @patch("build_city_pulse_neighborhood.count_rows", return_value=0)
    def test_skips_when_all_staging_empty(self, mock_count, mock_truncate):
        from build_city_pulse_neighborhood import build
        result = build()
        assert result["status"] == "skipped"
        mock_truncate.assert_not_called()


class TestNeighborhoodComparisonGuard:
    @patch("build_neighborhood_comparison.truncate_table")
    @patch("build_neighborhood_comparison.count_rows", return_value=0)
    def test_skips_when_all_staging_empty(self, mock_count, mock_truncate):
        from build_neighborhood_comparison import build
        result = build()
        assert result["status"] == "skipped"
        mock_truncate.assert_not_called()


class TestNarrativeSignalsGuard:
    @patch("build_narrative_signals.truncate_table")
    @patch("build_narrative_signals.count_rows", return_value=0)
    def test_skips_when_all_source_marts_empty(self, mock_count, mock_truncate):
        from build_narrative_signals import build
        result = build()
        assert result["status"] == "skipped"
        mock_truncate.assert_not_called()
