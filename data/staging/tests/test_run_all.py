"""Tests for staging orchestrator error handling."""

import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import run_all


class TestOrchestratorPartialFailure:
    """Verify orchestrator handles individual transform failures gracefully."""

    @patch("run_all.transform_aqi")
    @patch("run_all.transform_311")
    @patch("run_all.transform_crashes")
    @patch("run_all.transform_crime")
    @patch("run_all.transform_neighborhoods")
    @patch("run_all.sync_neighborhoods")
    def test_one_failure_doesnt_block_others(
        self, mock_sync, mock_nbhd, mock_crime, mock_crashes, mock_311, mock_aqi
    ):
        mock_sync.sync.return_value = {"source": "sync_neighborhoods", "status": "ok"}
        mock_nbhd.transform.return_value = {"source": "stg_neighborhoods", "status": "ok", "inserted": 78}
        mock_crime.transform.side_effect = RuntimeError("DB connection lost")
        mock_crashes.transform.return_value = {"source": "stg_crashes", "status": "ok", "inserted": 500}
        mock_311.transform.return_value = {"source": "stg_311", "status": "ok", "inserted": 1000}
        mock_aqi.transform.return_value = {"source": "stg_aqi", "status": "ok", "inserted": 200}

        exit_code = run_all.main()

        # All transforms should have been called despite crime failure
        mock_crashes.transform.assert_called_once()
        mock_311.transform.assert_called_once()
        mock_aqi.transform.assert_called_once()

        # Exit code should be 1 (errors present)
        assert exit_code == 1

    @patch("run_all.transform_aqi")
    @patch("run_all.transform_311")
    @patch("run_all.transform_crashes")
    @patch("run_all.transform_crime")
    @patch("run_all.transform_neighborhoods")
    @patch("run_all.sync_neighborhoods")
    def test_all_success_returns_zero(
        self, mock_sync, mock_nbhd, mock_crime, mock_crashes, mock_311, mock_aqi
    ):
        ok = {"status": "ok", "source": "test", "inserted": 100}
        mock_sync.sync.return_value = {**ok, "source": "sync_neighborhoods"}
        mock_nbhd.transform.return_value = {**ok, "source": "stg_neighborhoods"}
        mock_crime.transform.return_value = {**ok, "source": "stg_crime"}
        mock_crashes.transform.return_value = {**ok, "source": "stg_crashes"}
        mock_311.transform.return_value = {**ok, "source": "stg_311"}
        mock_aqi.transform.return_value = {**ok, "source": "stg_aqi"}

        exit_code = run_all.main()
        assert exit_code == 0
