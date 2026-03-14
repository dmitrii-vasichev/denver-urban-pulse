"""Tests for mart orchestrator error handling."""

import sys
import os
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "staging"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import run_all


class TestMartOrchestrator:
    @patch("run_all.build_narrative_signals")
    @patch("run_all.build_category_breakdown")
    @patch("run_all.build_heatmap")
    @patch("run_all.build_neighborhood_comparison")
    @patch("run_all.build_neighborhood_ranking")
    @patch("run_all.build_city_pulse_neighborhood")
    @patch("run_all.build_incident_trends")
    @patch("run_all.build_aqi_daily")
    @patch("run_all.build_city_pulse_daily")
    def test_partial_failure_continues(self, *mocks):
        ok = {"status": "ok", "source": "test", "inserted": 10}
        for m in mocks:
            m.build.return_value = {**ok, "source": m._mock_name}

        # Make one fail
        mocks[0].build.side_effect = RuntimeError("DB down")

        exit_code = run_all.main()

        # All should have been called
        for m in mocks:
            m.build.assert_called_once()

        assert exit_code == 1

    @patch("run_all.build_narrative_signals")
    @patch("run_all.build_category_breakdown")
    @patch("run_all.build_heatmap")
    @patch("run_all.build_neighborhood_comparison")
    @patch("run_all.build_neighborhood_ranking")
    @patch("run_all.build_city_pulse_neighborhood")
    @patch("run_all.build_incident_trends")
    @patch("run_all.build_aqi_daily")
    @patch("run_all.build_city_pulse_daily")
    def test_all_success_returns_zero(self, *mocks):
        ok = {"status": "ok", "source": "test", "inserted": 10}
        for m in mocks:
            m.build.return_value = {**ok, "source": m._mock_name}

        exit_code = run_all.main()
        assert exit_code == 0
