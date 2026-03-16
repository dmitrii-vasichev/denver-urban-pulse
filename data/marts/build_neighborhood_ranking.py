"""
Build mart_neighborhood_ranking — ranked neighborhoods by composite score.

For each (period, neighborhood): count by domain, compute composite_score
(min-max normalized sum), assign rank. Higher score = more pressure.

Periods: 7d, 30d, 90d
"""

import logging
import time

from db import count_rows, execute_sql, truncate_table

logger = logging.getLogger(__name__)

# Two-step: first insert raw counts, then update with normalized scores and ranks
INSERT_COUNTS_SQL = """
INSERT INTO mart_neighborhood_ranking (
    period, neighborhood,
    crime_count, crash_count, requests_311_count,
    composite_score, rank, updated_at
)
SELECT
    %(period)s AS period,
    n.canonical_name AS neighborhood,
    COALESCE(c.crime, 0),
    COALESCE(c.crashes, 0),
    COALESCE(c.r311, 0),
    0,  -- placeholder, updated below
    0,  -- placeholder
    NOW()
FROM ref_neighborhoods n
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
    ) all_src
    GROUP BY neighborhood
) c ON c.neighborhood = n.canonical_name
ON CONFLICT (period, neighborhood) DO UPDATE SET
    crime_count = EXCLUDED.crime_count,
    crash_count = EXCLUDED.crash_count,
    requests_311_count = EXCLUDED.requests_311_count,
    updated_at = NOW()
"""

# Normalize each domain 0-1 across neighborhoods, sum for composite score
UPDATE_SCORES_SQL = """
WITH stats AS (
    SELECT
        period,
        NULLIF(MAX(crime_count), 0) AS max_crime,
        NULLIF(MAX(crash_count), 0) AS max_crash,
        NULLIF(MAX(requests_311_count), 0) AS max_311
    FROM mart_neighborhood_ranking
    WHERE period = %(period)s
    GROUP BY period
),
scored AS (
    SELECT
        r.id,
        COALESCE(r.crime_count::numeric / s.max_crime, 0) +
        COALESCE(r.crash_count::numeric / s.max_crash, 0) +
        COALESCE(r.requests_311_count::numeric / s.max_311, 0) AS score
    FROM mart_neighborhood_ranking r
    CROSS JOIN stats s
    WHERE r.period = %(period)s
),
ranked AS (
    SELECT id, score,
           ROW_NUMBER() OVER (ORDER BY score DESC) AS rnk
    FROM scored
)
UPDATE mart_neighborhood_ranking r
SET composite_score = ROUND(rk.score::numeric, 3),
    rank = rk.rnk,
    updated_at = NOW()
FROM ranked rk
WHERE r.id = rk.id
"""

PERIODS = [
    ("7d", 7),
    ("30d", 30),
    ("90d", 90),
]


def build() -> dict:
    """Build the mart_neighborhood_ranking table."""
    start = time.time()
    logger.info("Building mart_neighborhood_ranking")

    source_count = count_rows("stg_crime") + count_rows("stg_crashes") + count_rows("stg_311")
    if source_count == 0:
        logger.warning("All staging tables empty — skipping build to preserve existing mart data")
        return {
            "source": "mart_neighborhood_ranking",
            "status": "skipped",
            "inserted": 0,
            "duration_s": round(time.time() - start, 1),
        }

    truncate_table("mart_neighborhood_ranking")
    total_rows = 0
    for period_label, days in PERIODS:
        rows = execute_sql(INSERT_COUNTS_SQL, {"period": period_label, "days": days})
        execute_sql(UPDATE_SCORES_SQL, {"period": period_label})
        total_rows += rows
        logger.info(f"  Period {period_label}: {rows} rows, scores computed")

    duration = round(time.time() - start, 1)
    logger.info(f"  mart_neighborhood_ranking: {total_rows} rows in {duration}s")

    return {
        "source": "mart_neighborhood_ranking",
        "status": "ok",
        "inserted": total_rows,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = build()
    print(f"Neighborhood ranking: {result}")
