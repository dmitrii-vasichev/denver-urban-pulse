"""
End-to-end pipeline verification script.

Connects to the database and runs checks across all pipeline layers:
raw, staging, marts. Outputs a structured report with PASS/FAIL per check.

Exit code 0 if all pass, 1 if any fail.

Usage:
    python data/pipeline/verify_pipeline.py
"""

import json
import logging
import math
import os
import sys
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [verify] %(message)s",
)
logger = logging.getLogger("verify")

# ── Table definitions ──────────────────────────────────────────────────

RAW_TABLES = [
    "raw_crime",
    "raw_crashes",
    "raw_311",
    "raw_aqi",
    "raw_neighborhoods",
]

STAGING_TABLES = [
    "stg_crime",
    "stg_crashes",
    "stg_311",
    "stg_aqi",
    "stg_neighborhoods",
]

MART_TABLES = [
    "mart_city_pulse_daily",
    "mart_city_pulse_neighborhood",
    "mart_incident_trends",
    "mart_category_breakdown",
    "mart_heatmap_hour_day",
    "mart_neighborhood_ranking",
    "mart_aqi_daily",
    "mart_neighborhood_comparison",
    "mart_narrative_signals",
]

# Staging tables with a neighborhood column
STAGING_WITH_NEIGHBORHOOD = ["stg_crime", "stg_crashes", "stg_311"]

# Staging tables with date columns for freshness checks
STAGING_DATE_COLUMNS = {
    "stg_crime": "reported_date",
    "stg_crashes": "reported_date",
    "stg_311": "case_created_date",
    "stg_aqi": "observed_at",
}

# Mart tables that have delta_pct columns
DELTA_TABLES = {
    "mart_city_pulse_neighborhood": [
        "crime_delta_pct",
        "crash_delta_pct",
        "requests_311_delta_pct",
        "total_delta_pct",
    ],
    "mart_neighborhood_comparison": [
        "crime_delta_pct",
        "crash_delta_pct",
        "requests_311_delta_pct",
    ],
}


# ── Database connection ────────────────────────────────────────────────

def get_connection():
    """Create a database connection from DATABASE_URL."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL not set")
        sys.exit(1)
    return psycopg2.connect(db_url, sslmode="require", connect_timeout=10)


# ── Check functions ────────────────────────────────────────────────────

def check_table_counts(conn, tables: list[str], layer: str) -> list[dict]:
    """Check that each table has at least one row."""
    results = []
    with conn.cursor() as cur:
        for table in tables:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")  # noqa: S608
                count = cur.fetchone()[0]
                passed = count > 0
                results.append({
                    "check": f"{layer}_count_{table}",
                    "status": "PASS" if passed else "FAIL",
                    "detail": f"{count} rows",
                })
            except Exception as e:
                results.append({
                    "check": f"{layer}_count_{table}",
                    "status": "FAIL",
                    "detail": str(e),
                })
                conn.rollback()
    return results


def check_staging_neighborhoods(conn) -> list[dict]:
    """Verify no NULL neighborhoods where raw data had neighborhood info."""
    results = []
    raw_to_staging = {
        "raw_crime": ("stg_crime", "neighborhood_id"),
        "raw_crashes": ("stg_crashes", "neighborhood_id"),
        "raw_311": ("stg_311", "neighborhood"),
    }
    with conn.cursor() as cur:
        for raw_table, (stg_table, raw_col) in raw_to_staging.items():
            try:
                # Count raw records that have a non-null neighborhood
                cur.execute(
                    f"SELECT COUNT(*) FROM {raw_table} WHERE {raw_col} IS NOT NULL AND {raw_col} != ''"  # noqa: S608
                )
                raw_with_nbhd = cur.fetchone()[0]

                # Count staging records with null neighborhood
                cur.execute(
                    f"SELECT COUNT(*) FROM {stg_table} WHERE neighborhood IS NULL"  # noqa: S608
                )
                stg_null_nbhd = cur.fetchone()[0]

                # Count total staging records
                cur.execute(f"SELECT COUNT(*) FROM {stg_table}")  # noqa: S608
                stg_total = cur.fetchone()[0]

                # If raw had neighborhoods but all staging are null, that's a problem
                if raw_with_nbhd > 0 and stg_total > 0 and stg_null_nbhd == stg_total:
                    passed = False
                    detail = (
                        f"All {stg_null_nbhd} staging rows have NULL neighborhood "
                        f"but raw had {raw_with_nbhd} with data"
                    )
                else:
                    passed = True
                    detail = (
                        f"raw_with_nbhd={raw_with_nbhd}, "
                        f"stg_null={stg_null_nbhd}/{stg_total}"
                    )

                results.append({
                    "check": f"staging_neighborhood_{stg_table}",
                    "status": "PASS" if passed else "FAIL",
                    "detail": detail,
                })
            except Exception as e:
                results.append({
                    "check": f"staging_neighborhood_{stg_table}",
                    "status": "FAIL",
                    "detail": str(e),
                })
                conn.rollback()
    return results


def check_staging_dates(conn) -> list[dict]:
    """Verify date columns are parsed correctly (no NULLs where expected)."""
    results = []
    with conn.cursor() as cur:
        for table, date_col in STAGING_DATE_COLUMNS.items():
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")  # noqa: S608
                total = cur.fetchone()[0]

                cur.execute(
                    f"SELECT COUNT(*) FROM {table} WHERE {date_col} IS NULL"  # noqa: S608
                )
                null_dates = cur.fetchone()[0]

                # All dates being null in a non-empty table is a failure
                if total > 0 and null_dates == total:
                    passed = False
                    detail = f"All {total} rows have NULL {date_col}"
                else:
                    passed = True
                    detail = f"null_dates={null_dates}/{total}"

                results.append({
                    "check": f"staging_dates_{table}",
                    "status": "PASS" if passed else "FAIL",
                    "detail": detail,
                })
            except Exception as e:
                results.append({
                    "check": f"staging_dates_{table}",
                    "status": "FAIL",
                    "detail": str(e),
                })
                conn.rollback()
    return results


def check_mart_aggregates(conn) -> list[dict]:
    """Verify mart tables have non-zero aggregate values."""
    results = []
    # Check a representative numeric column per mart
    mart_checks = {
        "mart_city_pulse_daily": "crime_count + crash_count + requests_311_count",
        "mart_city_pulse_neighborhood": "total_incidents",
        "mart_incident_trends": "count",
        "mart_category_breakdown": "count",
        "mart_heatmap_hour_day": "count",
        "mart_neighborhood_ranking": "composite_score",
        "mart_aqi_daily": "aqi_max",
        "mart_neighborhood_comparison": "crime_rate",
        "mart_narrative_signals": "signal_numeric",
    }
    with conn.cursor() as cur:
        for table, col_expr in mart_checks.items():
            try:
                cur.execute(
                    f"SELECT COUNT(*) FROM {table} WHERE ({col_expr}) > 0"  # noqa: S608
                )
                nonzero = cur.fetchone()[0]
                passed = nonzero > 0
                results.append({
                    "check": f"mart_aggregates_{table}",
                    "status": "PASS" if passed else "FAIL",
                    "detail": f"{nonzero} rows with nonzero values",
                })
            except Exception as e:
                results.append({
                    "check": f"mart_aggregates_{table}",
                    "status": "FAIL",
                    "detail": str(e),
                })
                conn.rollback()
    return results


def check_delta_values(conn) -> list[dict]:
    """Check for NaN or Infinity in delta_pct columns."""
    results = []
    with conn.cursor() as cur:
        for table, columns in DELTA_TABLES.items():
            for col in columns:
                try:
                    cur.execute(
                        f"SELECT COUNT(*) FROM {table} "  # noqa: S608
                        f"WHERE {col} = 'NaN'::float "
                        f"OR {col} = 'Infinity'::float "
                        f"OR {col} = '-Infinity'::float"
                    )
                    bad_count = cur.fetchone()[0]
                    passed = bad_count == 0
                    results.append({
                        "check": f"delta_{table}_{col}",
                        "status": "PASS" if passed else "FAIL",
                        "detail": f"{bad_count} NaN/Infinity values",
                    })
                except Exception as e:
                    results.append({
                        "check": f"delta_{table}_{col}",
                        "status": "FAIL",
                        "detail": str(e),
                    })
                    conn.rollback()
    return results


def check_aqi_range(conn) -> list[dict]:
    """Verify AQI values are within 0-500 range."""
    results = []
    with conn.cursor() as cur:
        try:
            cur.execute(
                "SELECT COUNT(*) FROM stg_aqi WHERE aqi < 0 OR aqi > 500"
            )
            out_of_range = cur.fetchone()[0]
            passed = out_of_range == 0
            results.append({
                "check": "aqi_range_stg",
                "status": "PASS" if passed else "FAIL",
                "detail": f"{out_of_range} out-of-range values",
            })
        except Exception as e:
            results.append({
                "check": "aqi_range_stg",
                "status": "FAIL",
                "detail": str(e),
            })
            conn.rollback()

        try:
            cur.execute(
                "SELECT COUNT(*) FROM mart_aqi_daily "
                "WHERE aqi_max < 0 OR aqi_max > 500"
            )
            out_of_range = cur.fetchone()[0]
            passed = out_of_range == 0
            results.append({
                "check": "aqi_range_mart",
                "status": "PASS" if passed else "FAIL",
                "detail": f"{out_of_range} out-of-range values",
            })
        except Exception as e:
            results.append({
                "check": "aqi_range_mart",
                "status": "FAIL",
                "detail": str(e),
            })
            conn.rollback()
    return results


def check_narrative_signals(conn) -> list[dict]:
    """Verify at least one narrative signal exists per period."""
    results = []
    periods = ["7d", "30d", "90d"]
    with conn.cursor() as cur:
        for period in periods:
            try:
                cur.execute(
                    "SELECT COUNT(*) FROM mart_narrative_signals WHERE period = %s",
                    (period,),
                )
                count = cur.fetchone()[0]
                passed = count > 0
                results.append({
                    "check": f"narrative_signals_{period}",
                    "status": "PASS" if passed else "FAIL",
                    "detail": f"{count} signals",
                })
            except Exception as e:
                results.append({
                    "check": f"narrative_signals_{period}",
                    "status": "FAIL",
                    "detail": str(e),
                })
                conn.rollback()
    return results


def check_data_freshness(conn) -> list[dict]:
    """Report the most recent dates in staging tables."""
    results = []
    with conn.cursor() as cur:
        for table, date_col in STAGING_DATE_COLUMNS.items():
            try:
                cur.execute(f"SELECT MAX({date_col}) FROM {table}")  # noqa: S608
                max_date = cur.fetchone()[0]
                if max_date is None:
                    results.append({
                        "check": f"freshness_{table}",
                        "status": "FAIL",
                        "detail": "No data found",
                    })
                else:
                    results.append({
                        "check": f"freshness_{table}",
                        "status": "PASS",
                        "detail": f"latest={max_date.isoformat()}",
                    })
            except Exception as e:
                results.append({
                    "check": f"freshness_{table}",
                    "status": "FAIL",
                    "detail": str(e),
                })
                conn.rollback()
    return results


# ── Report generation ──────────────────────────────────────────────────

def generate_report(all_results: list[dict]) -> dict:
    """Build a summary report from individual check results."""
    total = len(all_results)
    passed = sum(1 for r in all_results if r["status"] == "PASS")
    failed = sum(1 for r in all_results if r["status"] == "FAIL")

    return {
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "summary": {
            "total_checks": total,
            "passed": passed,
            "failed": failed,
            "all_passed": failed == 0,
        },
        "checks": all_results,
    }


def run_all_checks(conn) -> list[dict]:
    """Execute all verification checks and return combined results."""
    all_results = []

    logger.info("Checking raw table counts...")
    all_results.extend(check_table_counts(conn, RAW_TABLES, "raw"))

    logger.info("Checking staging table counts...")
    all_results.extend(check_table_counts(conn, STAGING_TABLES, "staging"))

    logger.info("Checking mart table counts...")
    all_results.extend(check_table_counts(conn, MART_TABLES, "mart"))

    logger.info("Checking staging neighborhoods...")
    all_results.extend(check_staging_neighborhoods(conn))

    logger.info("Checking staging dates...")
    all_results.extend(check_staging_dates(conn))

    logger.info("Checking mart aggregates...")
    all_results.extend(check_mart_aggregates(conn))

    logger.info("Checking delta values...")
    all_results.extend(check_delta_values(conn))

    logger.info("Checking AQI range...")
    all_results.extend(check_aqi_range(conn))

    logger.info("Checking narrative signals...")
    all_results.extend(check_narrative_signals(conn))

    logger.info("Checking data freshness...")
    all_results.extend(check_data_freshness(conn))

    return all_results


# ── Main ───────────────────────────────────────────────────────────────

def main():
    logger.info("=" * 60)
    logger.info("PIPELINE VERIFICATION — START")
    logger.info("=" * 60)

    conn = get_connection()
    try:
        all_results = run_all_checks(conn)
    finally:
        conn.close()

    report = generate_report(all_results)

    # Print report
    logger.info("\n" + "=" * 60)
    logger.info("VERIFICATION REPORT")
    logger.info("=" * 60)

    for r in report["checks"]:
        icon = "PASS" if r["status"] == "PASS" else "FAIL"
        logger.info(f"  [{icon}] {r['check']:45s} — {r['detail']}")

    summary = report["summary"]
    logger.info("")
    logger.info(
        f"  Total: {summary['total_checks']}  "
        f"Passed: {summary['passed']}  "
        f"Failed: {summary['failed']}"
    )

    # Print JSON report to stdout for machine consumption
    print(json.dumps(report, indent=2, default=str))

    if summary["all_passed"]:
        logger.info("ALL CHECKS PASSED")
        return 0
    else:
        logger.error(f"{summary['failed']} CHECK(S) FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())
