-- Migration 002: Staging tables
-- Cleaned, normalized data with consistent column names and types.

CREATE TABLE IF NOT EXISTS stg_crime (
    id SERIAL PRIMARY KEY,
    incident_id TEXT NOT NULL,
    offense_id TEXT,
    offense_code TEXT,
    offense_type TEXT,
    offense_category TEXT,
    first_occurrence_date TIMESTAMPTZ,
    reported_date TIMESTAMPTZ NOT NULL,
    incident_address TEXT,
    longitude DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    district_id TEXT,
    precinct_id TEXT,
    neighborhood TEXT,  -- normalized via ref_neighborhoods
    victim_count INTEGER DEFAULT 0,
    UNIQUE (incident_id, offense_id)
);

CREATE TABLE IF NOT EXISTS stg_crashes (
    id SERIAL PRIMARY KEY,
    incident_id TEXT NOT NULL,
    offense_id TEXT,
    top_offense TEXT,
    first_occurrence_date TIMESTAMPTZ,
    reported_date TIMESTAMPTZ NOT NULL,
    incident_address TEXT,
    longitude DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    district_id TEXT,
    precinct_id TEXT,
    neighborhood TEXT,
    bicycle_involved BOOLEAN DEFAULT FALSE,
    pedestrian_involved BOOLEAN DEFAULT FALSE,
    seriously_injured INTEGER DEFAULT 0,
    fatalities INTEGER DEFAULT 0,
    road_condition TEXT,
    light_condition TEXT,
    UNIQUE (incident_id, offense_id)
);

CREATE TABLE IF NOT EXISTS stg_311 (
    id SERIAL PRIMARY KEY,
    case_summary TEXT,
    case_status TEXT,
    case_source TEXT,
    case_created_date TIMESTAMPTZ NOT NULL,
    case_closed_date TIMESTAMPTZ,
    first_call_resolution BOOLEAN DEFAULT FALSE,
    incident_address TEXT,
    zip_code TEXT,
    longitude DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    agency TEXT,
    division TEXT,
    major_area TEXT,
    request_type TEXT,
    topic TEXT,
    council_district INTEGER,
    police_district INTEGER,
    neighborhood TEXT
);

CREATE TABLE IF NOT EXISTS stg_aqi (
    id SERIAL PRIMARY KEY,
    observed_at TIMESTAMPTZ NOT NULL,
    reporting_area TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    aqi INTEGER NOT NULL,
    category TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    UNIQUE (observed_at, reporting_area, parameter_name)
);

CREATE TABLE IF NOT EXISTS stg_neighborhoods (
    id SERIAL PRIMARY KEY,
    nbhd_id SMALLINT NOT NULL UNIQUE,
    nbhd_name TEXT NOT NULL UNIQUE,
    typology TEXT,
    geojson JSONB,  -- parsed GeoJSON geometry
    shape_area DOUBLE PRECISION,
    shape_length DOUBLE PRECISION
);

-- Indexes for staging tables
CREATE INDEX IF NOT EXISTS idx_stg_crime_reported ON stg_crime (reported_date);
CREATE INDEX IF NOT EXISTS idx_stg_crime_neighborhood ON stg_crime (neighborhood);
CREATE INDEX IF NOT EXISTS idx_stg_crashes_reported ON stg_crashes (reported_date);
CREATE INDEX IF NOT EXISTS idx_stg_crashes_neighborhood ON stg_crashes (neighborhood);
CREATE INDEX IF NOT EXISTS idx_stg_311_created ON stg_311 (case_created_date);
CREATE INDEX IF NOT EXISTS idx_stg_311_neighborhood ON stg_311 (neighborhood);
CREATE INDEX IF NOT EXISTS idx_stg_aqi_observed ON stg_aqi (observed_at);
