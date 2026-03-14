"""
Sync ref_neighborhoods alternate name columns from raw data.

Discovers actual neighborhood name variants used in each raw dataset
and populates the corresponding columns in ref_neighborhoods:
- crime_name  ← raw_crime.neighborhood_id
- crash_name  ← raw_crashes.neighborhood_id
- name_311    ← raw_311.neighborhood

Uses case-insensitive fuzzy matching to map raw names to canonical names.
"""

import logging
import time

from db import get_connection

logger = logging.getLogger(__name__)

# (column_to_update, SQL to fetch distinct raw names)
SOURCES = [
    (
        "crime_name",
        "SELECT DISTINCT neighborhood_id AS name FROM raw_crime WHERE neighborhood_id IS NOT NULL",
    ),
    (
        "crash_name",
        "SELECT DISTINCT neighborhood_id AS name FROM raw_crashes WHERE neighborhood_id IS NOT NULL",
    ),
    (
        "name_311",
        "SELECT DISTINCT neighborhood AS name FROM raw_311 WHERE neighborhood IS NOT NULL",
    ),
]


def _build_canonical_lookup(conn) -> dict[str, str]:
    """Build lowercase canonical_name → canonical_name mapping."""
    with conn.cursor() as cur:
        cur.execute("SELECT canonical_name FROM ref_neighborhoods")
        rows = cur.fetchall()
    return {name.lower().strip(): name for (name,) in rows}


def _normalize_words(name: str) -> str:
    """Reduce a name to sorted-ish space-separated words for fuzzy comparison."""
    return " ".join(name.replace("-", " ").split())


def _match_name(raw_name: str, lookup: dict[str, str]) -> str | None:
    """Try to match a raw neighborhood name to a canonical name."""
    key = raw_name.lower().strip()

    # Exact match
    if key in lookup:
        return lookup[key]

    # Try replacing hyphens with ' - '
    normalized = key.replace("-", " - ").replace("  ", " ")
    if normalized in lookup:
        return lookup[normalized]

    # Try removing hyphens entirely
    no_hyphen = key.replace("-", " ").replace("  ", " ")
    if no_hyphen in lookup:
        return lookup[no_hyphen]

    # Fuzzy: compare normalized word sequences
    raw_words = _normalize_words(key)
    for canonical_key, canonical_val in lookup.items():
        if _normalize_words(canonical_key) == raw_words:
            return canonical_val

    return None


def sync(dry_run: bool = False) -> dict:
    """
    Sync alternate neighborhood names from raw data into ref_neighborhoods.

    Returns dict with counts of matched/unmatched names per source.
    """
    start = time.time()
    logger.info("Starting neighborhood name sync")

    conn = get_connection()
    try:
        lookup = _build_canonical_lookup(conn)
        logger.info(f"  Loaded {len(lookup)} canonical neighborhoods")

        results = {}

        for col, query in SOURCES:
            with conn.cursor() as cur:
                cur.execute(query)
                raw_names = [row[0] for row in cur.fetchall()]

            matched = 0
            unmatched_names = []

            for raw_name in raw_names:
                canonical = _match_name(raw_name, lookup)
                if canonical:
                    if not dry_run:
                        with conn.cursor() as cur:
                            cur.execute(
                                f"UPDATE ref_neighborhoods SET {col} = %s "
                                f"WHERE canonical_name = %s AND ({col} IS NULL OR {col} != %s)",
                                (raw_name, canonical, raw_name),
                            )
                    matched += 1
                else:
                    unmatched_names.append(raw_name)

            if not dry_run:
                conn.commit()

            results[col] = {
                "total": len(raw_names),
                "matched": matched,
                "unmatched": len(unmatched_names),
            }

            if unmatched_names:
                logger.warning(
                    f"  {col}: {len(unmatched_names)} unmatched names: "
                    f"{unmatched_names[:10]}{'...' if len(unmatched_names) > 10 else ''}"
                )
            else:
                logger.info(f"  {col}: all {matched} names matched")

    finally:
        conn.close()

    duration = round(time.time() - start, 1)
    logger.info(f"  Neighborhood sync complete in {duration}s")

    return {
        "source": "sync_neighborhoods",
        "status": "ok",
        "results": results,
        "duration_s": duration,
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    result = sync()
    print(f"Neighborhood sync: {result}")
