"""
Shared database utilities for mart builds.

Loads staging db utilities by file path to avoid circular imports,
and adds mart-specific helpers.
"""

import importlib.util
import os
import sys

# Load staging/db.py as a distinct module to avoid name collision
_staging_db_path = os.path.join(os.path.dirname(__file__), "..", "staging", "db.py")
_spec = importlib.util.spec_from_file_location("staging_db", _staging_db_path)
_staging_db = importlib.util.module_from_spec(_spec)
sys.modules["staging_db"] = _staging_db
_spec.loader.exec_module(_staging_db)

get_connection = _staging_db.get_connection
bulk_upsert = _staging_db.bulk_upsert
truncate_table = _staging_db.truncate_table
fetch_raw_data = _staging_db.fetch_raw_data


def execute_sql(sql: str, params: tuple = ()) -> int:
    """Execute a SQL statement and return row count."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rowcount = cur.rowcount
        conn.commit()
        return rowcount
    finally:
        conn.close()


def fetch_rows(sql: str, params: tuple = ()) -> list[tuple]:
    """Fetch rows as tuples."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        conn.close()


def count_rows(table: str) -> int:
    """Return the number of rows in a table."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {table}")  # noqa: S608 — table name is always a literal from our code
            return cur.fetchone()[0]
    finally:
        conn.close()
