-- Raw tables are no longer used (ingestion writes directly to stg_*).
-- Drop them to reclaim disk space. Keep raw_neighborhoods (small, needed for ref_neighborhoods).

DROP TABLE IF EXISTS raw_crime;
DROP TABLE IF EXISTS raw_crashes;
DROP TABLE IF EXISTS raw_311;
DROP TABLE IF EXISTS raw_aqi;
