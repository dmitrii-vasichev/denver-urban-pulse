"""Tests for end-to-end pipeline verification script."""

import sys
import os
from unittest.mock import patch, MagicMock, call
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from verify_pipeline import (
    check_table_counts,
    check_staging_neighborhoods,
    check_staging_dates,
    check_mart_aggregates,
    check_delta_values,
    check_aqi_range,
    check_narrative_signals,
    check_data_freshness,
    generate_report,
    run_all_checks,
)


def _mock_conn_with_results(fetchone_values):
    """Create a mock connection that returns specified values from fetchone()."""
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
    conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
    cursor.fetchone = MagicMock(side_effect=fetchone_values)
    return conn


class TestCheckTableCounts:
    def test_all_tables_have_data(self):
        conn = _mock_conn_with_results([(100,), (200,), (50,)])
        results = check_table_counts(conn, ["t1", "t2", "t3"], "raw")
        assert len(results) == 3
        assert all(r["status"] == "PASS" for r in results)

    def test_empty_table_fails(self):
        conn = _mock_conn_with_results([(100,), (0,)])
        results = check_table_counts(conn, ["t1", "t2"], "raw")
        assert results[0]["status"] == "PASS"
        assert results[1]["status"] == "FAIL"

    def test_returns_proper_structure(self):
        conn = _mock_conn_with_results([(42,)])
        results = check_table_counts(conn, ["test_table"], "staging")
        assert len(results) == 1
        r = results[0]
        assert "check" in r
        assert "status" in r
        assert "detail" in r
        assert r["check"] == "staging_count_test_table"
        assert "42" in r["detail"]

    def test_db_error_produces_fail(self):
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
        conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        cursor.execute.side_effect = Exception("relation does not exist")
        results = check_table_counts(conn, ["bad_table"], "raw")
        assert results[0]["status"] == "FAIL"
        assert "relation does not exist" in results[0]["detail"]


class TestCheckStagingNeighborhoods:
    def test_pass_when_staging_has_neighborhoods(self):
        # raw_with_nbhd=100, stg_null=10, stg_total=100 (for each of 3 tables)
        values = [(100,), (10,), (100,)] * 3
        conn = _mock_conn_with_results(values)
        results = check_staging_neighborhoods(conn)
        assert len(results) == 3
        assert all(r["status"] == "PASS" for r in results)

    def test_fail_when_all_staging_null(self):
        # raw has data but all staging neighborhoods are null
        values = [(50,), (20,), (20,)] * 3
        conn = _mock_conn_with_results(values)
        results = check_staging_neighborhoods(conn)
        assert len(results) == 3
        # stg_null == stg_total => FAIL
        assert all(r["status"] == "FAIL" for r in results)

    def test_returns_proper_structure(self):
        values = [(10,), (5,), (20,)]
        conn = _mock_conn_with_results(values)
        results = check_staging_neighborhoods(conn)
        assert len(results) >= 1
        r = results[0]
        assert "check" in r
        assert "status" in r
        assert "detail" in r


class TestCheckStagingDates:
    def test_pass_when_dates_exist(self):
        # total=100, null_dates=5 for each of 4 tables
        values = [(100,), (5,)] * 4
        conn = _mock_conn_with_results(values)
        results = check_staging_dates(conn)
        assert len(results) == 4
        assert all(r["status"] == "PASS" for r in results)

    def test_fail_when_all_dates_null(self):
        # total=50, null_dates=50 for each of 4 tables
        values = [(50,), (50,)] * 4
        conn = _mock_conn_with_results(values)
        results = check_staging_dates(conn)
        assert all(r["status"] == "FAIL" for r in results)

    def test_returns_proper_structure(self):
        values = [(10,), (0,)]
        conn = _mock_conn_with_results(values)
        results = check_staging_dates(conn)
        r = results[0]
        assert "check" in r
        assert "status" in r
        assert "detail" in r


class TestCheckMartAggregates:
    def test_pass_when_nonzero(self):
        # 9 mart tables, each with nonzero count > 0
        values = [(10,)] * 9
        conn = _mock_conn_with_results(values)
        results = check_mart_aggregates(conn)
        assert len(results) == 9
        assert all(r["status"] == "PASS" for r in results)

    def test_fail_when_all_zero(self):
        values = [(0,)] * 9
        conn = _mock_conn_with_results(values)
        results = check_mart_aggregates(conn)
        assert all(r["status"] == "FAIL" for r in results)


class TestCheckDeltaValues:
    def test_pass_when_no_bad_values(self):
        # 4 columns for mart_city_pulse_neighborhood + 3 for mart_neighborhood_comparison = 7
        values = [(0,)] * 7
        conn = _mock_conn_with_results(values)
        results = check_delta_values(conn)
        assert len(results) == 7
        assert all(r["status"] == "PASS" for r in results)

    def test_fail_when_nan_found(self):
        values = [(5,)] * 7
        conn = _mock_conn_with_results(values)
        results = check_delta_values(conn)
        assert all(r["status"] == "FAIL" for r in results)

    def test_returns_proper_structure(self):
        values = [(0,)]
        conn = _mock_conn_with_results(values)
        results = check_delta_values(conn)
        r = results[0]
        assert "check" in r
        assert r["check"].startswith("delta_")
        assert "status" in r
        assert "detail" in r


class TestCheckAqiRange:
    def test_pass_when_in_range(self):
        values = [(0,), (0,)]  # stg + mart
        conn = _mock_conn_with_results(values)
        results = check_aqi_range(conn)
        assert len(results) == 2
        assert all(r["status"] == "PASS" for r in results)

    def test_fail_when_out_of_range(self):
        values = [(3,), (1,)]
        conn = _mock_conn_with_results(values)
        results = check_aqi_range(conn)
        assert all(r["status"] == "FAIL" for r in results)


class TestCheckNarrativeSignals:
    def test_pass_when_signals_exist(self):
        values = [(5,), (3,), (4,)]  # 7d, 30d, 90d
        conn = _mock_conn_with_results(values)
        results = check_narrative_signals(conn)
        assert len(results) == 3
        assert all(r["status"] == "PASS" for r in results)

    def test_fail_when_no_signals(self):
        values = [(0,), (0,), (0,)]
        conn = _mock_conn_with_results(values)
        results = check_narrative_signals(conn)
        assert all(r["status"] == "FAIL" for r in results)


class TestCheckDataFreshness:
    def test_pass_with_recent_data(self):
        dt = datetime(2026, 3, 10, tzinfo=timezone.utc)
        values = [(dt,)] * 4
        conn = _mock_conn_with_results(values)
        results = check_data_freshness(conn)
        assert len(results) == 4
        assert all(r["status"] == "PASS" for r in results)
        assert "2026-03-10" in results[0]["detail"]

    def test_fail_when_no_data(self):
        values = [(None,)] * 4
        conn = _mock_conn_with_results(values)
        results = check_data_freshness(conn)
        assert all(r["status"] == "FAIL" for r in results)


class TestGenerateReport:
    def test_report_structure(self):
        checks = [
            {"check": "a", "status": "PASS", "detail": "ok"},
            {"check": "b", "status": "FAIL", "detail": "bad"},
            {"check": "c", "status": "PASS", "detail": "ok"},
        ]
        report = generate_report(checks)

        assert "timestamp" in report
        assert "summary" in report
        assert "checks" in report

        s = report["summary"]
        assert s["total_checks"] == 3
        assert s["passed"] == 2
        assert s["failed"] == 1
        assert s["all_passed"] is False

    def test_all_passed(self):
        checks = [
            {"check": "a", "status": "PASS", "detail": "ok"},
            {"check": "b", "status": "PASS", "detail": "ok"},
        ]
        report = generate_report(checks)
        assert report["summary"]["all_passed"] is True

    def test_empty_checks(self):
        report = generate_report([])
        assert report["summary"]["total_checks"] == 0
        assert report["summary"]["passed"] == 0
        assert report["summary"]["failed"] == 0
        assert report["summary"]["all_passed"] is True


class TestRunAllChecks:
    def test_returns_list_of_dicts(self):
        """Verify run_all_checks returns a list of check dicts."""
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
        conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        # Return (count,) for every fetchone call
        cursor.fetchone = MagicMock(return_value=(10,))

        results = run_all_checks(conn)
        assert isinstance(results, list)
        assert len(results) > 0
        for r in results:
            assert "check" in r
            assert "status" in r
            assert "detail" in r
