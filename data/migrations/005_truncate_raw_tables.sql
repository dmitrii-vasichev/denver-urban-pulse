-- Reclaim disk space: ingestion now writes directly to stg_* tables.
-- Raw tables are no longer populated (except raw_neighborhoods).
-- Keep table definitions for backwards compatibility, just empty them.

TRUNCATE TABLE raw_crime RESTART IDENTITY;
TRUNCATE TABLE raw_crashes RESTART IDENTITY;
TRUNCATE TABLE raw_311 RESTART IDENTITY;
TRUNCATE TABLE raw_aqi RESTART IDENTITY;
