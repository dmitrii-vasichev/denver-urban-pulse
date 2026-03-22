"""
Master pipeline runner — executes the complete daily refresh.

Pipeline order:
1. Run migrations (idempotent)
2. Run ingestion (raw data from APIs)
3. Sync neighborhoods (populate ref_neighborhoods alternate names)
4. Run staging transforms (raw → staging)
5. Run mart builds (staging → marts)

Exit code 0 if all succeeded, 1 if any step failed.

Usage:
    python data/pipeline/run_daily.py
"""

import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [pipeline] %(message)s",
)
logger = logging.getLogger("pipeline")

# Base directory for all data scripts
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _run_script(name: str, script_path: str, cwd: str) -> dict:
    """Run a Python script as a subprocess and capture result."""
    start = time.time()
    logger.info(f"  Running {name}...")

    try:
        result = subprocess.run(
            [sys.executable, script_path],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 min per step
            env={**os.environ},
        )

        duration = round(time.time() - start, 1)

        if result.returncode == 0:
            logger.info(f"  {name}: OK ({duration}s)")
            if result.stdout:
                for line in result.stdout.strip().split("\n")[-5:]:
                    logger.info(f"    {line}")
            return {"step": name, "status": "ok", "duration_s": duration}
        else:
            logger.error(f"  {name}: FAILED (exit {result.returncode}, {duration}s)")
            if result.stderr:
                for line in result.stderr.strip().split("\n")[-50:]:
                    logger.error(f"    {line}")
            return {
                "step": name,
                "status": "error",
                "exit_code": result.returncode,
                "duration_s": duration,
                "error": result.stderr[-2000:] if result.stderr else "",
            }
    except subprocess.TimeoutExpired:
        duration = round(time.time() - start, 1)
        logger.error(f"  {name}: TIMEOUT after {duration}s")
        return {"step": name, "status": "error", "duration_s": duration, "error": "timeout"}
    except Exception as e:
        duration = round(time.time() - start, 1)
        logger.error(f"  {name}: EXCEPTION — {e}")
        return {"step": name, "status": "error", "duration_s": duration, "error": str(e)}


def main():
    pipeline_start = datetime.now(tz=timezone.utc)
    logger.info("=" * 60)
    logger.info("DAILY PIPELINE — START")
    logger.info(f"  Time: {pipeline_start.isoformat()}")
    logger.info("=" * 60)

    steps = [
        ("1_migrations", "migrations/run_migrations.py", BASE_DIR),
        ("2_ingestion", "ingestion/run_all.py", os.path.join(BASE_DIR, "ingestion")),
        ("3_sync_neighborhoods", "staging/sync_neighborhoods.py", os.path.join(BASE_DIR, "staging")),
        ("4_staging", "staging/run_all.py", os.path.join(BASE_DIR, "staging")),
        ("5_marts", "marts/run_all.py", os.path.join(BASE_DIR, "marts")),
    ]

    results = []
    for name, script, cwd in steps:
        logger.info(f"\n{'='*40}")
        logger.info(f"STEP: {name}")
        logger.info(f"{'='*40}")

        script_path = os.path.join(BASE_DIR, script)
        result = _run_script(name, script_path, cwd)
        results.append(result)

        if result["status"] == "error":
            logger.warning(f"Step {name} failed — continuing with remaining steps")

    # Summary
    total_duration = (datetime.now(tz=timezone.utc) - pipeline_start).total_seconds()
    logger.info("\n" + "=" * 60)
    logger.info("PIPELINE SUMMARY")
    logger.info("=" * 60)

    has_errors = False
    for r in results:
        icon = "OK" if r["status"] == "ok" else "FAIL"
        dur = r.get("duration_s", 0)
        logger.info(f"  [{icon:4s}] {r['step']:25s} — {dur:>6.1f}s")
        if r["status"] == "error":
            has_errors = True

    logger.info(f"\n  Total duration: {total_duration:.1f}s")

    if has_errors:
        logger.error("PIPELINE COMPLETED WITH ERRORS")
        return 1
    else:
        logger.info("PIPELINE COMPLETED SUCCESSFULLY")
        return 0


if __name__ == "__main__":
    sys.exit(main())
