"""
Build mart_incident_trends — daily counts by domain + category.

Crime by offense_category, crashes by top_offense, 311 by request_type.
Uses UPSERT for idempotency.
"""

import logging
import time

from db import execute_sql, truncate_table

logger = logging.getLogger(__name__)

BUILD_SQL = """
INSERT INTO mart_incident_trends (date, domain, category, count, updated_at)

-- Crime by offense_category
SELECT
    reported_date::date AS date,
    'crime' AS domain,
    COALESCE(offense_category, 'Unknown') AS category,
    COUNT(*) AS count,
    NOW()
FROM stg_crime
GROUP BY reported_date::date, offense_category

UNION ALL

-- Crashes by top_offense
SELECT
    reported_date::date AS date,
    'crashes' AS domain,
    COALESCE(top_offense, 'Unknown') AS category,
    COUNT(*) AS count,
    NOW()
FROM stg_crashes
GROUP BY reported_date::date, top_offense

UNION ALL

-- 311 by request_type
SELECT
    case_created_date::date AS date,
    '311' AS domain,
    COALESCE(request_type, 'Unknown') AS category,
    COUNT(*) AS count,
    NOW()
FROM stg_311
GROUP BY case_created_date::date, request_type

ON CONFLICT (date, domain, category) DO UPDATE SET
    count = EXCLUDED.count,
    updated_at = NOW()
"""


def build() -> dict:
    """Build the mart_incident_trends table."""
    start = time.time()
    logger.info("Building mart_incident_trends")

    truncate_table("mart_incident_trends")
    rows = execute_sql(BUILD_SQL)

    duration = round(time.time() - start, 1)
    logger.info(f"  mart_incident_trends: {rows} rows in {duration}s")

    return {
        "source": "mart_incident_trends",
        "status": "ok",
        "inserted": rows,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = build()
    print(f"Incident trends: {result}")
