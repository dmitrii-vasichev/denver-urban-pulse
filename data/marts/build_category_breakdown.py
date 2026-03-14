"""
Build mart_category_breakdown — counts and percentages by category.

For each (period, domain, category): count incidents, compute pct_of_total.

Periods: 7d, 30d, 90d
"""

import logging
import time

from db import execute_sql, truncate_table

logger = logging.getLogger(__name__)

# Insert counts first, then update percentages
INSERT_SQL = """
INSERT INTO mart_category_breakdown (
    period, domain, category, count, pct_of_total, updated_at
)
-- Crime by offense_category
SELECT
    %(period)s, 'crime',
    COALESCE(offense_category, 'Unknown'),
    COUNT(*), 0, NOW()
FROM stg_crime
WHERE reported_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s
GROUP BY offense_category

UNION ALL

-- Crashes by top_offense
SELECT
    %(period)s, 'crashes',
    COALESCE(top_offense, 'Unknown'),
    COUNT(*), 0, NOW()
FROM stg_crashes
WHERE reported_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s
GROUP BY top_offense

UNION ALL

-- 311 by request_type
SELECT
    %(period)s, '311',
    COALESCE(request_type, 'Unknown'),
    COUNT(*), 0, NOW()
FROM stg_311
WHERE case_created_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s
GROUP BY request_type

ON CONFLICT (period, domain, category) DO UPDATE SET
    count = EXCLUDED.count,
    updated_at = NOW()
"""

UPDATE_PCT_SQL = """
UPDATE mart_category_breakdown cb
SET pct_of_total = ROUND(
    cb.count::numeric / NULLIF(totals.total, 0) * 100, 1
)
FROM (
    SELECT period, domain, SUM(count) AS total
    FROM mart_category_breakdown
    WHERE period = %(period)s
    GROUP BY period, domain
) totals
WHERE cb.period = totals.period
  AND cb.domain = totals.domain
  AND cb.period = %(period)s
"""

PERIODS = [("7d", 7), ("30d", 30), ("90d", 90)]


def build() -> dict:
    start = time.time()
    logger.info("Building mart_category_breakdown")

    truncate_table("mart_category_breakdown")
    total_rows = 0
    for period_label, days in PERIODS:
        rows = execute_sql(INSERT_SQL, {"period": period_label, "days": days})
        execute_sql(UPDATE_PCT_SQL, {"period": period_label})
        total_rows += rows
        logger.info(f"  Period {period_label}: {rows} rows")

    duration = round(time.time() - start, 1)
    logger.info(f"  mart_category_breakdown: {total_rows} rows in {duration}s")

    return {
        "source": "mart_category_breakdown",
        "status": "ok",
        "inserted": total_rows,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    print(f"Category breakdown: {build()}")
