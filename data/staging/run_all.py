"""
Orchestrator: run all staging transformations in sequence.

Order:
1. sync_neighborhoods (populate alternate name mappings)
2. transform_neighborhoods (raw → stg)
3. transform_crime (raw → stg)
4. transform_crashes (raw → stg)
5. transform_311 (raw → stg)
6. transform_aqi (raw → stg)

Partial failure tolerance — one transform failing doesn't block others.

Usage:
    python data/staging/run_all.py
"""

import logging
import sys
from datetime import datetime, timezone

import sync_neighborhoods
import transform_311
import transform_aqi
import transform_crashes
import transform_crime
import transform_neighborhoods

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("staging_orchestrator")


def main():
    start = datetime.now(tz=timezone.utc)
    logger.info("Starting staging transformations")
    logger.info("=" * 60)

    steps = [
        ("sync_neighborhoods", sync_neighborhoods.sync),
        ("stg_neighborhoods", transform_neighborhoods.transform),
        ("stg_crime", transform_crime.transform),
        ("stg_crashes", transform_crashes.transform),
        ("stg_311", transform_311.transform),
        ("stg_aqi", transform_aqi.transform),
    ]

    results = []
    for name, func in steps:
        logger.info(f"\n--- {name.upper()} ---")
        try:
            result = func()
            results.append(result)
            inserted = result.get("inserted", "-")
            logger.info(f"{name}: {result['status']} — {inserted} records")
        except Exception as e:
            logger.error(f"{name}: FAILED — {e}", exc_info=True)
            results.append({
                "source": name,
                "status": "error",
                "error": str(e),
            })

    # Summary
    elapsed = (datetime.now(tz=timezone.utc) - start).total_seconds()
    logger.info("\n" + "=" * 60)
    logger.info("STAGING SUMMARY")
    logger.info("=" * 60)

    has_errors = False
    for r in results:
        source = r.get("source", "unknown")
        status = r.get("status", "unknown")
        status_icon = "OK" if status == "ok" else "WARN" if status == "warning" else "FAIL"
        inserted = r.get("inserted", "-")
        logger.info(f"  [{status_icon:4s}] {source:25s} — {str(inserted):>8s} records")
        if status == "error":
            has_errors = True

    logger.info(f"\n  Elapsed: {elapsed:.1f}s")

    if has_errors:
        logger.warning("Some transforms failed! Check logs above.")
        return 1
    else:
        logger.info("All staging transforms completed successfully!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
