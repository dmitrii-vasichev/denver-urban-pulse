"""
Build mart_narrative_signals — top signals for template narrative blocks.

Signals per period:
- top_domain: which domain had largest delta increase
- top_neighborhood: highest composite score neighborhood
- top_category: most frequent category in the top domain
- aqi_status: current AQI level and value
- most_improved: neighborhood with largest negative delta

Periods: 7d, 30d, 90d
"""

import logging
import time

from db import execute_sql, truncate_table

logger = logging.getLogger(__name__)

# Each signal is a separate INSERT using data from other marts
SIGNALS = [
    # top_domain: domain with highest volume-weighted delta
    (
        "top_domain",
        """
        INSERT INTO mart_narrative_signals (period, signal_type, signal_key, signal_value, signal_numeric, rank, updated_at)
        SELECT %(period)s, 'top_domain', domain, domain,
               delta_pct, 1, NOW()
        FROM (
            SELECT 'crime' AS domain,
                   ROUND((SUM(crime_count * crime_delta_pct) / NULLIF(SUM(crime_count), 0))::numeric, 1) AS delta_pct
            FROM mart_city_pulse_neighborhood WHERE period = %(period)s AND crime_delta_pct IS NOT NULL
            UNION ALL
            SELECT 'crashes',
                   ROUND((SUM(crash_count * crash_delta_pct) / NULLIF(SUM(crash_count), 0))::numeric, 1)
            FROM mart_city_pulse_neighborhood WHERE period = %(period)s AND crash_delta_pct IS NOT NULL
            UNION ALL
            SELECT '311',
                   ROUND((SUM(requests_311_count * requests_311_delta_pct) / NULLIF(SUM(requests_311_count), 0))::numeric, 1)
            FROM mart_city_pulse_neighborhood WHERE period = %(period)s AND requests_311_delta_pct IS NOT NULL
        ) domains
        ORDER BY delta_pct DESC NULLS LAST
        LIMIT 1
        ON CONFLICT (period, signal_type, rank) DO UPDATE SET
            signal_key = EXCLUDED.signal_key,
            signal_value = EXCLUDED.signal_value,
            signal_numeric = EXCLUDED.signal_numeric,
            updated_at = NOW()
        """,
    ),
    # top_neighborhood: highest composite score
    (
        "top_neighborhood",
        """
        INSERT INTO mart_narrative_signals (period, signal_type, signal_key, signal_value, signal_numeric, rank, updated_at)
        SELECT %(period)s, 'top_neighborhood', neighborhood, neighborhood,
               composite_score, 1, NOW()
        FROM mart_neighborhood_ranking
        WHERE period = %(period)s AND rank = 1
        LIMIT 1
        ON CONFLICT (period, signal_type, rank) DO UPDATE SET
            signal_key = EXCLUDED.signal_key,
            signal_value = EXCLUDED.signal_value,
            signal_numeric = EXCLUDED.signal_numeric,
            updated_at = NOW()
        """,
    ),
    # top_category: most frequent category across all domains
    (
        "top_category",
        """
        INSERT INTO mart_narrative_signals (period, signal_type, signal_key, signal_value, signal_numeric, rank, updated_at)
        SELECT %(period)s, 'top_category',
               domain || ':' || category,
               category,
               count, 1, NOW()
        FROM mart_category_breakdown
        WHERE period = %(period)s
        ORDER BY count DESC
        LIMIT 1
        ON CONFLICT (period, signal_type, rank) DO UPDATE SET
            signal_key = EXCLUDED.signal_key,
            signal_value = EXCLUDED.signal_value,
            signal_numeric = EXCLUDED.signal_numeric,
            updated_at = NOW()
        """,
    ),
    # aqi_status: latest AQI reading
    (
        "aqi_status",
        """
        INSERT INTO mart_narrative_signals (period, signal_type, signal_key, signal_value, signal_numeric, rank, updated_at)
        SELECT %(period)s, 'aqi_status',
               category,
               category || ' (' || aqi_max || ')',
               aqi_max, 1, NOW()
        FROM mart_aqi_daily
        WHERE aqi_max IS NOT NULL
        ORDER BY date DESC
        LIMIT 1
        ON CONFLICT (period, signal_type, rank) DO UPDATE SET
            signal_key = EXCLUDED.signal_key,
            signal_value = EXCLUDED.signal_value,
            signal_numeric = EXCLUDED.signal_numeric,
            updated_at = NOW()
        """,
    ),
    # most_improved: neighborhood with largest negative total_delta_pct
    (
        "most_improved",
        """
        INSERT INTO mart_narrative_signals (period, signal_type, signal_key, signal_value, signal_numeric, rank, updated_at)
        SELECT %(period)s, 'most_improved', neighborhood, neighborhood,
               total_delta_pct, 1, NOW()
        FROM mart_city_pulse_neighborhood
        WHERE period = %(period)s AND total_delta_pct IS NOT NULL AND total_delta_pct < 0
        ORDER BY total_delta_pct ASC
        LIMIT 1
        ON CONFLICT (period, signal_type, rank) DO UPDATE SET
            signal_key = EXCLUDED.signal_key,
            signal_value = EXCLUDED.signal_value,
            signal_numeric = EXCLUDED.signal_numeric,
            updated_at = NOW()
        """,
    ),
]

PERIODS = [("7d", 7), ("30d", 30), ("90d", 90)]


def build() -> dict:
    start = time.time()
    logger.info("Building mart_narrative_signals")

    truncate_table("mart_narrative_signals")
    total_rows = 0
    for period_label, _ in PERIODS:
        for signal_name, sql in SIGNALS:
            try:
                rows = execute_sql(sql, {"period": period_label})
                total_rows += rows
            except Exception as e:
                logger.warning(f"  Signal {signal_name}/{period_label} failed: {e}")
        logger.info(f"  Period {period_label}: signals computed")

    duration = round(time.time() - start, 1)
    logger.info(f"  mart_narrative_signals: {total_rows} rows in {duration}s")

    return {
        "source": "mart_narrative_signals",
        "status": "ok",
        "inserted": total_rows,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    print(f"Narrative signals: {build()}")
