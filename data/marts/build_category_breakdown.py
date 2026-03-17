"""
Build mart_category_breakdown — counts and percentages by category.

For each (period, domain, category): count incidents, compute pct_of_total.

Periods: 7d, 30d, 90d
"""

import logging
import time

from db import count_rows, execute_sql, truncate_table

logger = logging.getLogger(__name__)

# Human-readable label for crime offense_category slugs
CRIME_LABEL_SQL = """
    CASE COALESCE(offense_category, 'unknown')
        WHEN 'all-other-crimes'        THEN 'Other'
        WHEN 'theft-from-motor-vehicle' THEN 'Vehicle Theft'
        WHEN 'white-collar-crime'       THEN 'White-Collar Crime'
        WHEN 'murder'                   THEN 'Homicide'
        ELSE INITCAP(REPLACE(COALESCE(offense_category, 'Unknown'), '-', ' '))
    END
"""

# Human-readable label for crash top_offense values
# Note: values are CHAR(30) padded with trailing spaces, so use TRIM()
CRASH_LABEL_SQL = """
    CASE TRIM(COALESCE(top_offense, 'Unknown'))
        WHEN 'TRAF - ACCIDENT'             THEN 'Traffic Accident'
        WHEN 'TRAF - ACCIDENT - HIT & RUN' THEN 'Hit & Run'
        WHEN 'TRAF - ACCIDENT - DUI/DUID'  THEN 'DUI / DUID'
        WHEN 'TRAF - ACCIDENT - SBI'       THEN 'Serious Bodily Injury'
        WHEN 'TRAF - ACCIDENT - POLICE'    THEN 'Police Involved'
        WHEN 'TRAF - ACCIDENT - FATAL'     THEN 'Fatal Crash'
        WHEN 'TRAF - HABITUAL OFFENDER'    THEN 'Habitual Offender'
        ELSE INITCAP(REPLACE(
            REPLACE(TRIM(COALESCE(top_offense, 'Unknown')), 'TRAF - ACCIDENT - ', ''),
            '-', ' '
        ))
    END
"""

# Insert counts first, then update percentages
INSERT_SQL = """
WITH data_anchor AS (
    SELECT LEAST(
        (SELECT MAX((reported_date AT TIME ZONE 'America/Denver')::date) FROM stg_crime),
        (SELECT MAX((reported_date AT TIME ZONE 'America/Denver')::date) FROM stg_crashes),
        (SELECT MAX((case_created_date AT TIME ZONE 'America/Denver')::date) FROM stg_311)
    ) AS ref_date
)
INSERT INTO mart_category_breakdown (
    period, domain, category, count, pct_of_total, updated_at
)
-- Crime by offense_category (human-readable labels)
SELECT
    %(period)s, 'crime',
    {crime_label},
    COUNT(*), 0, NOW()
FROM stg_crime CROSS JOIN data_anchor
WHERE reported_date > (data_anchor.ref_date - %(days)s)::timestamp AT TIME ZONE 'America/Denver'
  AND reported_date <= (data_anchor.ref_date + 1)::timestamp AT TIME ZONE 'America/Denver'
GROUP BY {crime_label}

UNION ALL

-- Crashes by top_offense (human-readable labels)
SELECT
    %(period)s, 'crashes',
    {crash_label},
    COUNT(*), 0, NOW()
FROM stg_crashes CROSS JOIN data_anchor
WHERE reported_date > (data_anchor.ref_date - %(days)s)::timestamp AT TIME ZONE 'America/Denver'
  AND reported_date <= (data_anchor.ref_date + 1)::timestamp AT TIME ZONE 'America/Denver'
GROUP BY {crash_label}

UNION ALL

-- 311 by agency (type and topic are NULL in source data)
SELECT
    %(period)s, '311',
    COALESCE(NULLIF(agency, ''), 'Other'),
    COUNT(*), 0, NOW()
FROM stg_311 CROSS JOIN data_anchor
WHERE case_created_date > (data_anchor.ref_date - %(days)s)::timestamp AT TIME ZONE 'America/Denver'
  AND case_created_date <= (data_anchor.ref_date + 1)::timestamp AT TIME ZONE 'America/Denver'
GROUP BY agency

ON CONFLICT (period, domain, category) DO UPDATE SET
    count = EXCLUDED.count,
    updated_at = NOW()
""".format(crime_label=CRIME_LABEL_SQL, crash_label=CRASH_LABEL_SQL)

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

    source_count = count_rows("stg_crime") + count_rows("stg_crashes") + count_rows("stg_311")
    if source_count == 0:
        logger.warning("All staging tables empty — skipping build to preserve existing mart data")
        return {
            "source": "mart_category_breakdown",
            "status": "skipped",
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

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
