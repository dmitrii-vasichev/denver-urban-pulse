"""
Run database migrations in order.

Usage:
    python data/migrations/run_migrations.py

Requires DATABASE_URL environment variable.
All migrations are idempotent (CREATE IF NOT EXISTS, ON CONFLICT DO NOTHING).
"""

import os
import sys
from pathlib import Path

import psycopg2


def get_connection():
    """Create database connection from DATABASE_URL."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    return psycopg2.connect(db_url)


def run_migration(conn, filepath: Path):
    """Execute a single migration file."""
    print(f"  Running: {filepath.name} ... ", end="", flush=True)
    sql = filepath.read_text()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("OK")


def main():
    print("Running database migrations")
    print("=" * 50)

    migrations_dir = Path(__file__).parent
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        print("No migration files found!")
        sys.exit(1)

    print(f"Found {len(migration_files)} migration(s)")

    conn = get_connection()
    try:
        for f in migration_files:
            run_migration(conn, f)

        # Verify tables were created
        print("\nVerifying tables...")
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables = [row[0] for row in cur.fetchall()]

        expected = [
            "raw_neighborhoods",
            "stg_crime", "stg_crashes", "stg_311", "stg_aqi", "stg_neighborhoods",
            "mart_city_pulse_daily", "mart_city_pulse_neighborhood",
            "mart_incident_trends", "mart_category_breakdown",
            "mart_heatmap_hour_day", "mart_neighborhood_ranking",
            "mart_aqi_daily", "mart_neighborhood_comparison",
            "mart_narrative_signals",
            "ref_neighborhoods",
            "pipeline_source_freshness",
        ]

        missing = [t for t in expected if t not in tables]
        if missing:
            print(f"  MISSING tables: {missing}")
            sys.exit(1)

        print(f"  All {len(expected)} expected tables present")

        # Check ref_neighborhoods populated
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM ref_neighborhoods")
            count = cur.fetchone()[0]
        print(f"  ref_neighborhoods: {count} rows")

        print(f"\nAll tables ({len(tables)} total):")
        for t in tables:
            layer = "raw" if t.startswith("raw_") else "stg" if t.startswith("stg_") else "mart" if t.startswith("mart_") else "ref" if t.startswith("ref_") else "other"
            print(f"  [{layer:4s}] {t}")

    finally:
        conn.close()

    print("\nMigrations completed successfully!")


if __name__ == "__main__":
    main()
