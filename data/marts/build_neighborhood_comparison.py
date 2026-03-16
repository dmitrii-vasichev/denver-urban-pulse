"""
Build mart_neighborhood_comparison — rates per area and deltas.

For each (period, neighborhood): compute rates (incidents per sq unit from
stg_neighborhoods.shape_area via ref_neighborhoods), compute delta_pct vs prior period.

Periods: 7d, 30d, 90d
"""

import logging
import time

from db import count_rows, execute_sql, truncate_table

logger = logging.getLogger(__name__)

COMPARISON_SQL = """
INSERT INTO mart_neighborhood_comparison (
    period, neighborhood,
    crime_rate, crash_rate, requests_311_rate,
    crime_delta_pct, crash_delta_pct, requests_311_delta_pct,
    updated_at
)
SELECT
    %(period)s AS period,
    r.canonical_name AS neighborhood,
    CASE WHEN COALESCE(n.shape_area, 0) > 0
         THEN ROUND((COALESCE(cur.crime, 0)::numeric / n.shape_area::numeric * 1000000)::numeric, 4)
         ELSE 0 END,
    CASE WHEN COALESCE(n.shape_area, 0) > 0
         THEN ROUND((COALESCE(cur.crashes, 0)::numeric / n.shape_area::numeric * 1000000)::numeric, 4)
         ELSE 0 END,
    CASE WHEN COALESCE(n.shape_area, 0) > 0
         THEN ROUND((COALESCE(cur.r311, 0)::numeric / n.shape_area::numeric * 1000000)::numeric, 4)
         ELSE 0 END,
    CASE WHEN COALESCE(prev.crime, 0) > 0
         THEN ROUND(((COALESCE(cur.crime, 0) - prev.crime)::numeric / prev.crime * 100)::numeric, 1)
         ELSE NULL END,
    CASE WHEN COALESCE(prev.crashes, 0) > 0
         THEN ROUND(((COALESCE(cur.crashes, 0) - prev.crashes)::numeric / prev.crashes * 100)::numeric, 1)
         ELSE NULL END,
    CASE WHEN COALESCE(prev.r311, 0) > 0
         THEN ROUND(((COALESCE(cur.r311, 0) - prev.r311)::numeric / prev.r311 * 100)::numeric, 1)
         ELSE NULL END,
    NOW()
FROM ref_neighborhoods r
LEFT JOIN stg_neighborhoods n ON n.nbhd_id = r.nbhd_id
LEFT JOIN (
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
) cur ON cur.neighborhood = r.canonical_name
LEFT JOIN (
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
) prev ON prev.neighborhood = r.canonical_name
ON CONFLICT (period, neighborhood) DO UPDATE SET
    crime_rate = EXCLUDED.crime_rate,
    crash_rate = EXCLUDED.crash_rate,
    requests_311_rate = EXCLUDED.requests_311_rate,
    crime_delta_pct = EXCLUDED.crime_delta_pct,
    crash_delta_pct = EXCLUDED.crash_delta_pct,
    requests_311_delta_pct = EXCLUDED.requests_311_delta_pct,
    updated_at = NOW()
"""

PERIODS = [
    ("7d", 7),
    ("30d", 30),
    ("90d", 90),
]


def build() -> dict:
    """Build the mart_neighborhood_comparison table."""
    start = time.time()
    logger.info("Building mart_neighborhood_comparison")

    source_count = count_rows("stg_crime") + count_rows("stg_crashes") + count_rows("stg_311")
    if source_count == 0:
        logger.warning("All staging tables empty — skipping build to preserve existing mart data")
        return {
            "source": "mart_neighborhood_comparison",
            "status": "skipped",
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

    truncate_table("mart_neighborhood_comparison")
    total_rows = 0
    for period_label, days in PERIODS:
        rows = execute_sql(COMPARISON_SQL, {"period": period_label, "days": days})
        total_rows += rows
        logger.info(f"  Period {period_label}: {rows} rows")

    duration = round(time.time() - start, 1)
    logger.info(f"  mart_neighborhood_comparison: {total_rows} rows in {duration}s")

    return {
        "source": "mart_neighborhood_comparison",
        "status": "ok",
        "inserted": total_rows,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = build()
    print(f"Neighborhood comparison: {result}")
