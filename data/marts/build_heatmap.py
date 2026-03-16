"""
Build mart_heatmap_hour_day — incident counts by hour × day-of-week.

For each (period, domain, day_of_week, hour_of_day): count incidents.
day_of_week: 0=Mon..6=Sun. Uses Denver local time for extraction.

Periods: 7d, 30d, 90d
"""

import logging
import time

from db import count_rows, execute_sql, truncate_table

logger = logging.getLogger(__name__)

HEATMAP_SQL = """
INSERT INTO mart_heatmap_hour_day (
    period, domain, day_of_week, hour_of_day, count, updated_at
)
-- Crime
SELECT
    %(period)s,
    'crime',
    EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver')::smallint - 1,
    EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')::smallint,
    COUNT(*),
    NOW()
FROM stg_crime
WHERE reported_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s
GROUP BY
    EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver'),
    EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')

UNION ALL

-- Crashes
SELECT
    %(period)s,
    'crashes',
    EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver')::smallint - 1,
    EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')::smallint,
    COUNT(*),
    NOW()
FROM stg_crashes
WHERE reported_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s
GROUP BY
    EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver'),
    EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')

UNION ALL

-- 311
SELECT
    %(period)s,
    '311',
    EXTRACT(ISODOW FROM case_created_date AT TIME ZONE 'America/Denver')::smallint - 1,
    EXTRACT(HOUR FROM case_created_date AT TIME ZONE 'America/Denver')::smallint,
    COUNT(*),
    NOW()
FROM stg_311
WHERE case_created_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s
GROUP BY
    EXTRACT(ISODOW FROM case_created_date AT TIME ZONE 'America/Denver'),
    EXTRACT(HOUR FROM case_created_date AT TIME ZONE 'America/Denver')

ON CONFLICT (period, domain, day_of_week, hour_of_day) DO UPDATE SET
    count = EXCLUDED.count,
    updated_at = NOW()
"""

PERIODS = [("7d", 7), ("30d", 30), ("90d", 90)]


def build() -> dict:
    start = time.time()
    logger.info("Building mart_heatmap_hour_day")

    source_count = count_rows("stg_crime") + count_rows("stg_crashes") + count_rows("stg_311")
    if source_count == 0:
        logger.warning("All staging tables empty — skipping build to preserve existing mart data")
        return {
            "source": "mart_heatmap_hour_day",
            "status": "skipped",
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

    truncate_table("mart_heatmap_hour_day")
    total_rows = 0
    for period_label, days in PERIODS:
        rows = execute_sql(HEATMAP_SQL, {"period": period_label, "days": days})
        total_rows += rows
        logger.info(f"  Period {period_label}: {rows} rows")

    duration = round(time.time() - start, 1)
    logger.info(f"  mart_heatmap_hour_day: {total_rows} rows in {duration}s")

    return {
        "source": "mart_heatmap_hour_day",
        "status": "ok",
        "inserted": total_rows,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    print(f"Heatmap: {build()}")
