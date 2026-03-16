"""
Build mart_city_pulse_daily — daily aggregates across crime, crashes, 311.

For each date: count incidents, sum victims/injuries/fatalities.
Uses UPSERT (ON CONFLICT DO UPDATE) for idempotency.
"""

import logging
import time

from db import count_rows, execute_sql, truncate_table

logger = logging.getLogger(__name__)

BUILD_SQL = """
INSERT INTO mart_city_pulse_daily (
    date, crime_count, crash_count, requests_311_count,
    crime_victim_count, crash_serious_injuries, crash_fatalities, updated_at
)
SELECT
    d.date,
    COALESCE(cr.crime_count, 0),
    COALESCE(ca.crash_count, 0),
    COALESCE(r.requests_count, 0),
    COALESCE(cr.victim_count, 0),
    COALESCE(ca.serious_injuries, 0),
    COALESCE(ca.fatalities, 0),
    NOW()
FROM (
    SELECT (reported_date AT TIME ZONE 'America/Denver')::date AS date FROM stg_crime
    UNION
    SELECT (reported_date AT TIME ZONE 'America/Denver')::date AS date FROM stg_crashes
    UNION
    SELECT (case_created_date AT TIME ZONE 'America/Denver')::date AS date FROM stg_311
) d
LEFT JOIN (
    SELECT (reported_date AT TIME ZONE 'America/Denver')::date AS date,
           COUNT(*) AS crime_count,
           SUM(victim_count) AS victim_count
    FROM stg_crime
    GROUP BY (reported_date AT TIME ZONE 'America/Denver')::date
) cr ON cr.date = d.date
LEFT JOIN (
    SELECT (reported_date AT TIME ZONE 'America/Denver')::date AS date,
           COUNT(*) AS crash_count,
           SUM(seriously_injured) AS serious_injuries,
           SUM(fatalities) AS fatalities
    FROM stg_crashes
    GROUP BY (reported_date AT TIME ZONE 'America/Denver')::date
) ca ON ca.date = d.date
LEFT JOIN (
    SELECT (case_created_date AT TIME ZONE 'America/Denver')::date AS date,
           COUNT(*) AS requests_count
    FROM stg_311
    GROUP BY (case_created_date AT TIME ZONE 'America/Denver')::date
) r ON r.date = d.date
ON CONFLICT (date) DO UPDATE SET
    crime_count = EXCLUDED.crime_count,
    crash_count = EXCLUDED.crash_count,
    requests_311_count = EXCLUDED.requests_311_count,
    crime_victim_count = EXCLUDED.crime_victim_count,
    crash_serious_injuries = EXCLUDED.crash_serious_injuries,
    crash_fatalities = EXCLUDED.crash_fatalities,
    updated_at = NOW()
"""


def build() -> dict:
    """Build the mart_city_pulse_daily table."""
    start = time.time()
    logger.info("Building mart_city_pulse_daily")

    source_count = count_rows("stg_crime") + count_rows("stg_crashes") + count_rows("stg_311")
    if source_count == 0:
        logger.warning("All staging tables empty — skipping build to preserve existing mart data")
        return {
            "source": "mart_city_pulse_daily",
            "status": "skipped",
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

    truncate_table("mart_city_pulse_daily")
    rows = execute_sql(BUILD_SQL)

    duration = round(time.time() - start, 1)
    logger.info(f"  mart_city_pulse_daily: {rows} rows in {duration}s")

    return {
        "source": "mart_city_pulse_daily",
        "status": "ok",
        "inserted": rows,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = build()
    print(f"City pulse daily: {result}")
