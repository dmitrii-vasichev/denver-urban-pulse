"""
Orchestrator: run all ingestion scripts in sequence.

Partial failure tolerance — one source failing doesn't block others.
Logs success/failure for each source.

Usage:
    python data/ingestion/run_all.py
"""

import logging
import sys
from datetime import datetime, timezone

import ingest_crime
import ingest_crashes
import ingest_311
import ingest_aqi
import ingest_neighborhoods

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("orchestrator")


def main():
    start = datetime.now(tz=timezone.utc)
    logger.info("Starting data ingestion pipeline")
    logger.info("=" * 60)

    sources = [
        ("neighborhoods", ingest_neighborhoods.ingest),
        ("crime", lambda: ingest_crime.ingest(days_back=90)),
        ("crashes", lambda: ingest_crashes.ingest(days_back=90)),
        ("311", lambda: ingest_311.ingest(days_back=90)),
        ("aqi", lambda: ingest_aqi.ingest(days_back=90)),
    ]

    results = []
    for name, func in sources:
        logger.info(f"\n--- {name.upper()} ---")
        try:
            result = func()
            results.append(result)
            logger.info(f"{name}: {result['status']} — {result.get('inserted', 0)} records")
        except Exception as e:
            logger.error(f"{name}: FAILED — {e}", exc_info=True)
            results.append({"source": name, "status": "error", "fetched": 0, "inserted": 0, "error": str(e)})

    # Summary
    elapsed = (datetime.now(tz=timezone.utc) - start).total_seconds()
    logger.info("\n" + "=" * 60)
    logger.info("INGESTION SUMMARY")
    logger.info("=" * 60)

    total_inserted = 0
    has_errors = False
    for r in results:
        status_icon = "OK" if r["status"] == "ok" else "WARN" if r["status"] == "warning" else "FAIL"
        inserted = r.get("inserted", 0)
        total_inserted += inserted
        logger.info(f"  [{status_icon:4s}] {r['source']:20s} — {inserted:>8,} records")
        if r["status"] == "error":
            has_errors = True

    logger.info(f"\n  Total records inserted: {total_inserted:,}")
    logger.info(f"  Elapsed: {elapsed:.1f}s")

    if has_errors:
        logger.warning("Some sources failed! Check logs above.")
        sys.exit(1)
    else:
        logger.info("All sources ingested successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
