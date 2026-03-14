"""Tests for neighborhood mart build scripts — SQL structure validation."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "staging"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from build_city_pulse_neighborhood import PERIOD_SQL as NBHD_SQL, PERIODS as NBHD_PERIODS
from build_neighborhood_ranking import INSERT_COUNTS_SQL, UPDATE_SCORES_SQL, PERIODS as RANK_PERIODS
from build_neighborhood_comparison import COMPARISON_SQL, PERIODS as COMP_PERIODS


class TestCityPulseNeighborhoodSQL:
    def test_inserts_into_correct_table(self):
        assert "INSERT INTO mart_city_pulse_neighborhood" in NBHD_SQL

    def test_has_upsert(self):
        assert "ON CONFLICT (neighborhood, period) DO UPDATE" in NBHD_SQL

    def test_queries_all_three_domains(self):
        assert "stg_crime" in NBHD_SQL
        assert "stg_crashes" in NBHD_SQL
        assert "stg_311" in NBHD_SQL

    def test_computes_delta(self):
        assert "delta" in NBHD_SQL.lower()

    def test_uses_prior_period(self):
        # Prior period = days*2 back to days back
        assert "%(days)s * 2" in NBHD_SQL

    def test_three_periods(self):
        assert len(NBHD_PERIODS) == 3
        labels = [p[0] for p in NBHD_PERIODS]
        assert "7d" in labels
        assert "30d" in labels
        assert "90d" in labels

    def test_handles_zero_division(self):
        # Should have CASE WHEN ... > 0 to avoid div by zero
        assert "> 0" in NBHD_SQL


class TestNeighborhoodRankingSQL:
    def test_inserts_into_correct_table(self):
        assert "INSERT INTO mart_neighborhood_ranking" in INSERT_COUNTS_SQL

    def test_has_upsert(self):
        assert "ON CONFLICT (period, neighborhood) DO UPDATE" in INSERT_COUNTS_SQL

    def test_update_computes_scores(self):
        assert "composite_score" in UPDATE_SCORES_SQL

    def test_update_assigns_rank(self):
        assert "ROW_NUMBER()" in UPDATE_SCORES_SQL

    def test_normalizes_per_domain(self):
        assert "max_crime" in UPDATE_SCORES_SQL
        assert "max_crash" in UPDATE_SCORES_SQL
        assert "max_311" in UPDATE_SCORES_SQL

    def test_three_periods(self):
        assert len(RANK_PERIODS) == 3


class TestNeighborhoodComparisonSQL:
    def test_inserts_into_correct_table(self):
        assert "INSERT INTO mart_neighborhood_comparison" in COMPARISON_SQL

    def test_has_upsert(self):
        assert "ON CONFLICT (period, neighborhood) DO UPDATE" in COMPARISON_SQL

    def test_computes_rates_per_area(self):
        assert "shape_area" in COMPARISON_SQL

    def test_computes_deltas(self):
        assert "delta_pct" in COMPARISON_SQL.lower()

    def test_handles_zero_area(self):
        assert "shape_area > 0" in COMPARISON_SQL

    def test_three_periods(self):
        assert len(COMP_PERIODS) == 3
