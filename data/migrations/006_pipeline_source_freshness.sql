-- Per-source freshness tracking: compare source max_date against DB max_date.
-- Upserted by data/ingestion/freshness_check.py on every pipeline run.
-- Used to disambiguate "source is lagging" from "our pipeline is broken".

CREATE TABLE IF NOT EXISTS pipeline_source_freshness (
    source          TEXT        PRIMARY KEY,           -- 'crime' | 'crashes' | '311' | 'aqi'
    source_max_date DATE,                              -- MAX(date) reported by the upstream API
    db_max_date     DATE,                              -- MAX(date) in the corresponding stg_* table
    drift_days      INTEGER,                           -- source_max_date - db_max_date (NULL if either is NULL)
    status          TEXT        NOT NULL,              -- 'ok' | 'source_lag' | 'pipeline_behind' | 'unknown'
    source_age_days INTEGER,                           -- today - source_max_date (how far the source itself lags)
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_source_freshness_status
    ON pipeline_source_freshness (status);
