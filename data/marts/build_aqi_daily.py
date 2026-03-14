"""
Build mart_aqi_daily — pivot stg_aqi by parameter_name.

For each date: max AQI across parameters, individual ozone/PM2.5/PM10 values,
category label based on the max AQI parameter.
Uses UPSERT for idempotency.
"""

import logging
import time

from db import execute_sql, truncate_table

logger = logging.getLogger(__name__)

BUILD_SQL = """
INSERT INTO mart_aqi_daily (date, aqi_ozone, aqi_pm25, aqi_pm10, aqi_max, category, updated_at)
SELECT
    (observed_at AT TIME ZONE 'America/Denver')::date AS date,
    MAX(CASE WHEN parameter_name = 'OZONE' THEN aqi END) AS aqi_ozone,
    MAX(CASE WHEN parameter_name = 'PM2.5' THEN aqi END) AS aqi_pm25,
    MAX(CASE WHEN parameter_name = 'PM10' THEN aqi END) AS aqi_pm10,
    MAX(aqi) AS aqi_max,
    -- Category from the parameter with the highest AQI
    (
        SELECT sq.category FROM stg_aqi sq
        WHERE (sq.observed_at AT TIME ZONE 'America/Denver')::date = (s.observed_at AT TIME ZONE 'America/Denver')::date
        ORDER BY sq.aqi DESC
        LIMIT 1
    ) AS category,
    NOW()
FROM stg_aqi s
GROUP BY (observed_at AT TIME ZONE 'America/Denver')::date
ON CONFLICT (date) DO UPDATE SET
    aqi_ozone = EXCLUDED.aqi_ozone,
    aqi_pm25 = EXCLUDED.aqi_pm25,
    aqi_pm10 = EXCLUDED.aqi_pm10,
    aqi_max = EXCLUDED.aqi_max,
    category = EXCLUDED.category,
    updated_at = NOW()
"""


def build() -> dict:
    """Build the mart_aqi_daily table."""
    start = time.time()
    logger.info("Building mart_aqi_daily")

    truncate_table("mart_aqi_daily")
    rows = execute_sql(BUILD_SQL)

    duration = round(time.time() - start, 1)
    logger.info(f"  mart_aqi_daily: {rows} rows in {duration}s")

    return {
        "source": "mart_aqi_daily",
        "status": "ok",
        "inserted": rows,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = build()
    print(f"AQI daily: {result}")
