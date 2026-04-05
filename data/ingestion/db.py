"""
Shared database utilities for ingestion scripts.

Includes neighborhood resolution helpers (formerly in staging/db.py)
for direct API → stg_* ingestion without intermediate raw tables.
"""

import logging
import os
import sys
import time

import psycopg2
import psycopg2.errors
import psycopg2.extras

logger = logging.getLogger(__name__)

_db_url = None


def _get_db_url():
    global _db_url
    if _db_url is None:
        _db_url = os.environ.get("DATABASE_URL")
        if not _db_url:
            print("ERROR: DATABASE_URL not set")
            sys.exit(1)
    return _db_url


def get_connection():
    """Create a fresh database connection from DATABASE_URL."""
    return psycopg2.connect(_get_db_url(), sslmode="require", connect_timeout=10)


def load_neighborhood_map(conn) -> dict[str, str]:
    """
    Load neighborhood name mapping from ref_neighborhoods.

    Returns dict mapping all known alternate names (lowered) → canonical_name.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT canonical_name, crime_name, crash_name, name_311 "
            "FROM ref_neighborhoods"
        )
        rows = cur.fetchall()

    mapping = {}
    for canonical, crime, crash, n311 in rows:
        mapping[canonical.lower().strip()] = canonical
        for alt in (crime, crash, n311):
            if alt:
                mapping[alt.lower().strip()] = canonical
    return mapping


def resolve_neighborhood(raw_name: str | None, nbhd_map: dict[str, str]) -> str | None:
    """Resolve a raw neighborhood name to canonical via the mapping."""
    if not raw_name:
        return None
    key = raw_name.lower().strip()
    resolved = nbhd_map.get(key)
    if resolved:
        return resolved
    normalized = key.replace("-", " - ").replace("  ", " ")
    return nbhd_map.get(normalized)


def bulk_insert(table: str, records: list[dict], columns: list[str],
                conflict_columns: list[str] | None = None) -> int:
    """
    Insert records using execute_values for high throughput.

    If conflict_columns specified, does ON CONFLICT DO UPDATE (upsert).
    Reconnects every 10 batches (~5k rows) to avoid Railway SSL drops.
    """
    if not records:
        return 0

    col_str = ", ".join(columns)
    template = "(" + ", ".join(f"%({c})s" for c in columns) + ")"

    if conflict_columns:
        conflict_str = ", ".join(conflict_columns)
        update_cols = [c for c in columns if c not in conflict_columns]
        update_str = ", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)
        sql = (
            f"INSERT INTO {table} ({col_str}) VALUES %s "
            f"ON CONFLICT ({conflict_str}) DO UPDATE SET {update_str}"
        )
    else:
        sql = f"INSERT INTO {table} ({col_str}) VALUES %s"

    batch_size = 500
    reconnect_every = 10  # reconnect every 10 batches (~5k rows)
    total = 0
    conn = None
    cur = None

    max_retries = 3

    for i in range(0, len(records), batch_size):
        batch_num = i // batch_size
        batch = records[i : i + batch_size]

        for attempt in range(max_retries):
            try:
                # Open or reconnect periodically
                if conn is None or batch_num % reconnect_every == 0:
                    if cur:
                        cur.close()
                    if conn:
                        conn.close()
                    conn = get_connection()
                    cur = conn.cursor()

                psycopg2.extras.execute_values(cur, sql, batch, template=template, page_size=500)
                conn.commit()
                total += len(batch)
                break
            except (psycopg2.OperationalError, psycopg2.IntegrityError) as e:
                logger.warning(f"  DB error at batch {batch_num} (attempt {attempt + 1}): {e}")
                # Force reconnect on next attempt
                try:
                    if conn:
                        conn.rollback()
                    if cur:
                        cur.close()
                    if conn:
                        conn.close()
                except Exception:
                    pass
                conn = None
                cur = None
                if attempt < max_retries - 1:
                    time.sleep(2 * (attempt + 1))
                else:
                    raise

        if total % 5000 == 0 or total >= len(records):
            logger.info(f"  Insert progress: {total}/{len(records)}")

    if cur:
        cur.close()
    if conn:
        conn.close()

    return total


def truncate_table(table: str):
    """Truncate a table (for full refresh)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY")
        conn.commit()
        logger.info(f"  Truncated {table}")
    finally:
        conn.close()
