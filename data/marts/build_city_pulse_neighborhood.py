"""
Build mart_city_pulse_neighborhood — per-neighborhood totals and deltas.

For each (neighborhood, period): count crime/crashes/311, compute total,
compute delta_pct vs prior period of same length.

Periods: 7d, 30d, 90d
Delta: ((current - prior) / prior) * 100, NULL if prior = 0.
"""

import logging
import time

from db import execute_sql, truncate_table

logger = logging.getLogger(__name__)

# Template SQL for one period
PERIOD_SQL = """
INSERT INTO mart_city_pulse_neighborhood (
    neighborhood, period,
    crime_count, crash_count, requests_311_count, total_incidents,
    crime_delta_pct, crash_delta_pct, requests_311_delta_pct, total_delta_pct,
    updated_at
)
SELECT
    n.neighborhood,
    %(period)s AS period,
    COALESCE(cur.crime, 0),
    COALESCE(cur.crashes, 0),
    COALESCE(cur.r311, 0),
    COALESCE(cur.crime, 0) + COALESCE(cur.crashes, 0) + COALESCE(cur.r311, 0),
    CASE WHEN COALESCE(prev.crime, 0) > 0
         THEN ROUND(((COALESCE(cur.crime, 0) - prev.crime)::numeric / prev.crime) * 100, 1)
         ELSE NULL END,
    CASE WHEN COALESCE(prev.crashes, 0) > 0
         THEN ROUND(((COALESCE(cur.crashes, 0) - prev.crashes)::numeric / prev.crashes) * 100, 1)
         ELSE NULL END,
    CASE WHEN COALESCE(prev.r311, 0) > 0
         THEN ROUND(((COALESCE(cur.r311, 0) - prev.r311)::numeric / prev.r311) * 100, 1)
         ELSE NULL END,
    CASE WHEN (COALESCE(prev.crime, 0) + COALESCE(prev.crashes, 0) + COALESCE(prev.r311, 0)) > 0
         THEN ROUND((
             (COALESCE(cur.crime, 0) + COALESCE(cur.crashes, 0) + COALESCE(cur.r311, 0))
             - (COALESCE(prev.crime, 0) + COALESCE(prev.crashes, 0) + COALESCE(prev.r311, 0))
         )::numeric / (COALESCE(prev.crime, 0) + COALESCE(prev.crashes, 0) + COALESCE(prev.r311, 0)) * 100, 1)
         ELSE NULL END,
    NOW()
FROM (
    SELECT canonical_name AS neighborhood FROM ref_neighborhoods
) n
LEFT JOIN (
    -- Current period counts
    SELECT neighborhood,
           SUM(CASE WHEN src = 'crime' THEN 1 ELSE 0 END) AS crime,
           SUM(CASE WHEN src = 'crashes' THEN 1 ELSE 0 END) AS crashes,
           SUM(CASE WHEN src = '311' THEN 1 ELSE 0 END) AS r311
    FROM (
        SELECT neighborhood, 'crime' AS src FROM stg_crime
        WHERE reported_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s AND neighborhood IS NOT NULL
        UNION ALL
        SELECT neighborhood, 'crashes' FROM stg_crashes
        WHERE reported_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s AND neighborhood IS NOT NULL
        UNION ALL
        SELECT neighborhood, '311' FROM stg_311
        WHERE case_created_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s AND neighborhood IS NOT NULL
    ) cur_all
    GROUP BY neighborhood
) cur ON cur.neighborhood = n.neighborhood
LEFT JOIN (
    -- Prior period counts (same length, immediately before)
    SELECT neighborhood,
           SUM(CASE WHEN src = 'crime' THEN 1 ELSE 0 END) AS crime,
           SUM(CASE WHEN src = 'crashes' THEN 1 ELSE 0 END) AS crashes,
           SUM(CASE WHEN src = '311' THEN 1 ELSE 0 END) AS r311
    FROM (
        SELECT neighborhood, 'crime' AS src FROM stg_crime
        WHERE reported_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s * 2
          AND reported_date < (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s
          AND neighborhood IS NOT NULL
        UNION ALL
        SELECT neighborhood, 'crashes' FROM stg_crashes
        WHERE reported_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s * 2
          AND reported_date < (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s
          AND neighborhood IS NOT NULL
        UNION ALL
        SELECT neighborhood, '311' FROM stg_311
        WHERE case_created_date >= (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s * 2
          AND case_created_date < (NOW() AT TIME ZONE 'America/Denver')::date - %(days)s
          AND neighborhood IS NOT NULL
    ) prev_all
    GROUP BY neighborhood
) prev ON prev.neighborhood = n.neighborhood
ON CONFLICT (neighborhood, period) DO UPDATE SET
    crime_count = EXCLUDED.crime_count,
    crash_count = EXCLUDED.crash_count,
    requests_311_count = EXCLUDED.requests_311_count,
    total_incidents = EXCLUDED.total_incidents,
    crime_delta_pct = EXCLUDED.crime_delta_pct,
    crash_delta_pct = EXCLUDED.crash_delta_pct,
    requests_311_delta_pct = EXCLUDED.requests_311_delta_pct,
    total_delta_pct = EXCLUDED.total_delta_pct,
    updated_at = NOW()
"""

PERIODS = [
    ("7d", 7),
    ("30d", 30),
    ("90d", 90),
]


def build() -> dict:
    """Build the mart_city_pulse_neighborhood table."""
    start = time.time()
    logger.info("Building mart_city_pulse_neighborhood")

    truncate_table("mart_city_pulse_neighborhood")
    total_rows = 0
    for period_label, days in PERIODS:
        rows = execute_sql(PERIOD_SQL, {"period": period_label, "days": days})
        total_rows += rows
        logger.info(f"  Period {period_label}: {rows} rows")

    duration = round(time.time() - start, 1)
    logger.info(f"  mart_city_pulse_neighborhood: {total_rows} rows in {duration}s")

    return {
        "source": "mart_city_pulse_neighborhood",
        "status": "ok",
        "inserted": total_rows,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = build()
    print(f"City pulse neighborhood: {result}")
