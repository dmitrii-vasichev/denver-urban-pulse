"""Tests for heatmap, category breakdown, and narrative signals SQL."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "staging"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from build_heatmap import HEATMAP_SQL, PERIODS as HM_PERIODS
from build_category_breakdown import INSERT_SQL as CAT_SQL, UPDATE_PCT_SQL, PERIODS as CAT_PERIODS
from build_narrative_signals import SIGNALS, PERIODS as SIG_PERIODS


class TestHeatmapSQL:
    def test_inserts_into_correct_table(self):
        assert "INSERT INTO mart_heatmap_hour_day" in HEATMAP_SQL

    def test_has_upsert(self):
        assert "ON CONFLICT (period, domain, day_of_week, hour_of_day) DO UPDATE" in HEATMAP_SQL

    def test_uses_denver_timezone(self):
        assert "America/Denver" in HEATMAP_SQL

    def test_extracts_isodow(self):
        assert "ISODOW" in HEATMAP_SQL

    def test_extracts_hour(self):
        assert "EXTRACT(HOUR" in HEATMAP_SQL

    def test_all_three_domains(self):
        assert "'crime'" in HEATMAP_SQL
        assert "'crashes'" in HEATMAP_SQL
        assert "'311'" in HEATMAP_SQL

    def test_three_periods(self):
        assert len(HM_PERIODS) == 3

    def test_uses_data_anchor_not_now(self):
        # Regression: NOW() caused empty results when data lagged behind current date
        assert "data_anchor" in HEATMAP_SQL
        assert "NOW() AT TIME ZONE" not in HEATMAP_SQL


class TestCategoryBreakdownSQL:
    def test_inserts_into_correct_table(self):
        assert "INSERT INTO mart_category_breakdown" in CAT_SQL

    def test_has_upsert(self):
        assert "ON CONFLICT (period, domain, category) DO UPDATE" in CAT_SQL

    def test_all_three_domains(self):
        assert "'crime'" in CAT_SQL
        assert "'crashes'" in CAT_SQL
        assert "'311'" in CAT_SQL

    def test_update_computes_percentage(self):
        assert "pct_of_total" in UPDATE_PCT_SQL
        assert "NULLIF" in UPDATE_PCT_SQL  # handles zero division

    def test_three_periods(self):
        assert len(CAT_PERIODS) == 3

    def test_uses_data_anchor_not_now(self):
        # Regression: NOW() caused empty results when data lagged behind current date
        assert "data_anchor" in CAT_SQL
        assert "NOW() AT TIME ZONE" not in CAT_SQL


class TestNarrativeSignals:
    def test_has_all_five_signal_types(self):
        signal_names = [s[0] for s in SIGNALS]
        assert "top_domain" in signal_names
        assert "top_neighborhood" in signal_names
        assert "top_category" in signal_names
        assert "aqi_status" in signal_names
        assert "most_improved" in signal_names

    def test_all_signals_have_upsert(self):
        for name, sql in SIGNALS:
            assert "ON CONFLICT" in sql, f"Signal {name} missing upsert"

    def test_top_domain_uses_delta(self):
        sql = next(s[1] for s in SIGNALS if s[0] == "top_domain")
        assert "delta_pct" in sql

    def test_top_neighborhood_uses_ranking(self):
        sql = next(s[1] for s in SIGNALS if s[0] == "top_neighborhood")
        assert "mart_neighborhood_ranking" in sql
        assert "rank = 1" in sql

    def test_aqi_status_uses_aqi_daily(self):
        sql = next(s[1] for s in SIGNALS if s[0] == "aqi_status")
        assert "mart_aqi_daily" in sql

    def test_most_improved_filters_negative(self):
        sql = next(s[1] for s in SIGNALS if s[0] == "most_improved")
        assert "< 0" in sql

    def test_three_periods(self):
        assert len(SIG_PERIODS) == 3
