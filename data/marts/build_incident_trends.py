"""
Build mart_incident_trends — daily counts by domain + category.

Crime by offense_category, crashes by top_offense, 311 by agency.
Category labels match mart_category_breakdown for sparkline lookups.
Uses UPSERT for idempotency.
"""

import logging
import time

from db import count_rows, execute_sql, truncate_table

logger = logging.getLogger(__name__)

# Human-readable labels — must match build_category_breakdown.py exactly
CRIME_LABEL_SQL = """
    CASE COALESCE(offense_category, 'unknown')
        WHEN 'all-other-crimes'        THEN 'Other'
        WHEN 'theft-from-motor-vehicle' THEN 'Vehicle Theft'
        WHEN 'white-collar-crime'       THEN 'White-Collar Crime'
        WHEN 'murder'                   THEN 'Homicide'
        ELSE INITCAP(REPLACE(COALESCE(offense_category, 'Unknown'), '-', ' '))
    END
"""

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

BUILD_SQL = """
INSERT INTO mart_incident_trends (date, domain, category, count, updated_at)

-- Crime by offense_category (human-readable labels)
SELECT
    (reported_date AT TIME ZONE 'America/Denver')::date AS date,
    'crime' AS domain,
    {crime_label} AS category,
    COUNT(*) AS count,
    NOW()
FROM stg_crime
GROUP BY (reported_date AT TIME ZONE 'America/Denver')::date, {crime_label}

UNION ALL

-- Crashes by top_offense (human-readable labels)
SELECT
    (reported_date AT TIME ZONE 'America/Denver')::date AS date,
    'crashes' AS domain,
    {crash_label} AS category,
    COUNT(*) AS count,
    NOW()
FROM stg_crashes
GROUP BY (reported_date AT TIME ZONE 'America/Denver')::date, {crash_label}

UNION ALL

-- 311 by agency (matches mart_category_breakdown)
SELECT
    (case_created_date AT TIME ZONE 'America/Denver')::date AS date,
    '311' AS domain,
    COALESCE(NULLIF(agency, ''), 'Other') AS category,
    COUNT(*) AS count,
    NOW()
FROM stg_311
GROUP BY (case_created_date AT TIME ZONE 'America/Denver')::date, agency

ON CONFLICT (date, domain, category) DO UPDATE SET
    count = EXCLUDED.count,
    updated_at = NOW()
""".format(crime_label=CRIME_LABEL_SQL, crash_label=CRASH_LABEL_SQL)


def build() -> dict:
    """Build the mart_incident_trends table."""
    start = time.time()
    logger.info("Building mart_incident_trends")

    source_count = count_rows("stg_crime") + count_rows("stg_crashes") + count_rows("stg_311")
    if source_count == 0:
        logger.warning("All staging tables empty — skipping build to preserve existing mart data")
        return {
            "source": "mart_incident_trends",
            "status": "skipped",
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

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
