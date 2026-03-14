"""
Orchestrator: build all 9 marts in correct dependency order.

Order:
1. city_pulse_daily, incident_trends, aqi_daily (independent)
2. city_pulse_neighborhood, neighborhood_ranking (depend on staging)
3. neighborhood_comparison (depends on stg_neighborhoods)
4. heatmap, category_breakdown (independent)
5. narrative_signals (depends on all other marts)

Partial failure tolerance — one mart failing doesn't block others.

Usage:
    python data/marts/run_all.py
"""

import logging
import sys
from datetime import datetime, timezone

import build_aqi_daily
import build_category_breakdown
import build_city_pulse_daily
import build_city_pulse_neighborhood
import build_heatmap
import build_incident_trends
import build_narrative_signals
import build_neighborhood_comparison
import build_neighborhood_ranking

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("mart_orchestrator")


def main():
    start = datetime.now(tz=timezone.utc)
    logger.info("Starting mart builds")
    logger.info("=" * 60)

    # Order matters: narrative_signals depends on other marts
    steps = [
        ("mart_city_pulse_daily", build_city_pulse_daily.build),
        ("mart_incident_trends", build_incident_trends.build),
        ("mart_aqi_daily", build_aqi_daily.build),
        ("mart_city_pulse_neighborhood", build_city_pulse_neighborhood.build),
        ("mart_neighborhood_ranking", build_neighborhood_ranking.build),
        ("mart_neighborhood_comparison", build_neighborhood_comparison.build),
        ("mart_heatmap_hour_day", build_heatmap.build),
        ("mart_category_breakdown", build_category_breakdown.build),
        ("mart_narrative_signals", build_narrative_signals.build),
    ]

    results = []
    for name, func in steps:
        logger.info(f"\n--- {name.upper()} ---")
        try:
            result = func()
            results.append(result)
            inserted = result.get("inserted", "-")
            logger.info(f"{name}: {result['status']} — {inserted} rows")
        except Exception as e:
            logger.error(f"{name}: FAILED — {e}", exc_info=True)
            results.append({"source": name, "status": "error", "error": str(e)})

    # Summary
    elapsed = (datetime.now(tz=timezone.utc) - start).total_seconds()
    logger.info("\n" + "=" * 60)
    logger.info("MART BUILD SUMMARY")
    logger.info("=" * 60)

    has_errors = False
    for r in results:
        source = r.get("source", "unknown")
        status = r.get("status", "unknown")
        icon = "OK" if status == "ok" else "WARN" if status == "warning" else "FAIL"
        inserted = r.get("inserted", "-")
        logger.info(f"  [{icon:4s}] {source:35s} — {str(inserted):>8s} rows")
        if status == "error":
            has_errors = True

    logger.info(f"\n  Elapsed: {elapsed:.1f}s")

    if has_errors:
        logger.warning("Some mart builds failed! Check logs above.")
        return 1
    else:
        logger.info("All marts built successfully!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
