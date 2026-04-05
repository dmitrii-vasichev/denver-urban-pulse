"""Tests for source vs DB freshness classification logic."""

import os
import sys
from datetime import date
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "ingestion"))

from freshness_check import (  # noqa: E402
    DRIFT_THRESHOLD_DAYS,
    SOURCE_LAG_THRESHOLD_DAYS,
    classify,
    format_report,
    main,
)


class TestClassify:
    today = date(2026, 4, 5)

    def test_ok_when_source_and_db_match(self):
        status, drift, age = classify(
            source_max=date(2026, 4, 4),
            db_max=date(2026, 4, 4),
            today=self.today,
        )
        assert status == "ok"
        assert drift == 0
        assert age == 1

    def test_ok_when_drift_within_threshold(self):
        # drift = 2 days, exactly at threshold → still ok
        status, _, _ = classify(
            source_max=date(2026, 4, 4),
            db_max=date(2026, 4, 2),
            today=self.today,
        )
        assert status == "ok"

    def test_pipeline_behind_when_drift_exceeds_threshold(self):
        # 7-day drift — this is the crime bug scenario
        status, drift, _ = classify(
            source_max=date(2026, 4, 2),
            db_max=date(2026, 3, 26),
            today=self.today,
        )
        assert status == "pipeline_behind"
        assert drift == 7

    def test_source_lag_when_source_behind_but_db_caught_up(self):
        # crashes scenario: source has been stuck at Mar 9 for weeks,
        # db matches it. Not our bug.
        status, drift, age = classify(
            source_max=date(2026, 3, 9),
            db_max=date(2026, 3, 9),
            today=self.today,
        )
        assert status == "source_lag"
        assert drift == 0
        assert age == 27

    def test_unknown_when_source_missing(self):
        status, drift, age = classify(
            source_max=None,
            db_max=date(2026, 4, 4),
            today=self.today,
        )
        assert status == "unknown"
        assert drift is None
        assert age is None

    def test_unknown_when_db_empty(self):
        status, _, _ = classify(
            source_max=date(2026, 4, 4),
            db_max=None,
            today=self.today,
        )
        assert status == "unknown"

    def test_pipeline_behind_takes_priority_over_source_lag(self):
        # Source is old (source_lag territory) AND our DB is even older
        # (pipeline_behind territory). pipeline_behind wins.
        status, drift, _ = classify(
            source_max=date(2026, 3, 9),
            db_max=date(2026, 2, 15),
            today=self.today,
        )
        assert status == "pipeline_behind"
        assert drift == 22

    def test_thresholds_are_sane(self):
        # Guard against someone accidentally lowering these to zero
        assert DRIFT_THRESHOLD_DAYS >= 1
        assert SOURCE_LAG_THRESHOLD_DAYS >= 3


class TestFormatReport:
    def test_renders_each_source(self):
        results = [
            {
                "source": "crime",
                "source_max_date": date(2026, 4, 2),
                "db_max_date": date(2026, 4, 2),
                "drift_days": 0,
                "source_age_days": 3,
                "status": "ok",
            },
            {
                "source": "crashes",
                "source_max_date": date(2026, 3, 9),
                "db_max_date": date(2026, 3, 9),
                "drift_days": 0,
                "source_age_days": 27,
                "status": "source_lag",
            },
        ]
        report = format_report(results)
        assert "crime" in report
        assert "crashes" in report
        assert "2026-04-02" in report
        assert "2026-03-09" in report
        assert "OK" in report
        assert "LAG" in report

    def test_handles_none_dates(self):
        results = [{
            "source": "aqi",
            "source_max_date": None,
            "db_max_date": None,
            "drift_days": None,
            "source_age_days": None,
            "status": "unknown",
        }]
        report = format_report(results)
        assert "aqi" in report
        assert "n/a" in report


class TestMainExitCode:
    @patch("freshness_check.run_check")
    def test_exits_0_when_all_ok(self, mock_run_check):
        mock_run_check.return_value = [
            {"source": "crime", "source_max_date": date(2026, 4, 2), "db_max_date": date(2026, 4, 2), "drift_days": 0, "source_age_days": 3, "status": "ok"},
            {"source": "crashes", "source_max_date": date(2026, 3, 9), "db_max_date": date(2026, 3, 9), "drift_days": 0, "source_age_days": 27, "status": "source_lag"},
        ]
        assert main() == 0

    @patch("freshness_check.run_check")
    def test_exits_1_when_any_pipeline_behind(self, mock_run_check):
        mock_run_check.return_value = [
            {"source": "crime", "source_max_date": date(2026, 4, 2), "db_max_date": date(2026, 3, 26), "drift_days": 7, "source_age_days": 3, "status": "pipeline_behind"},
            {"source": "crashes", "source_max_date": date(2026, 3, 9), "db_max_date": date(2026, 3, 9), "drift_days": 0, "source_age_days": 27, "status": "source_lag"},
        ]
        assert main() == 1

    @patch("freshness_check.run_check")
    def test_exits_0_when_unknown(self, mock_run_check):
        # 'unknown' is a warning, not a hard fail. We don't want the pipeline
        # failing because the check itself is broken.
        mock_run_check.return_value = [
            {"source": "aqi", "source_max_date": None, "db_max_date": None, "drift_days": None, "source_age_days": None, "status": "unknown"},
        ]
        assert main() == 0

    @patch("freshness_check.run_check")
    def test_exits_1_on_exception(self, mock_run_check):
        mock_run_check.side_effect = RuntimeError("db down")
        assert main() == 1
