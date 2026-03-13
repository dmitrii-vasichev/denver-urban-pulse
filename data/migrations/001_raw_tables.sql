-- Migration 001: Raw tables
-- Store unmodified data from each source with ingestion timestamp.

CREATE TABLE IF NOT EXISTS raw_crime (
    id SERIAL PRIMARY KEY,
    incident_id TEXT,
    offense_id TEXT,
    offense_code TEXT,
    offense_code_extension SMALLINT,
    offense_type_id TEXT,
    offense_category_id TEXT,
    first_occurrence_date TIMESTAMPTZ,
    last_occurrence_date TIMESTAMPTZ,
    reported_date TIMESTAMPTZ,
    incident_address TEXT,
    geo_x INTEGER,
    geo_y INTEGER,
    geo_lon DOUBLE PRECISION,
    geo_lat DOUBLE PRECISION,
    district_id TEXT,
    precinct_id TEXT,
    neighborhood_id TEXT,
    is_crime SMALLINT,
    is_traffic SMALLINT,
    victim_count DOUBLE PRECISION,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_crashes (
    id SERIAL PRIMARY KEY,
    incident_id TEXT,
    offense_id TEXT,
    offense_code TEXT,
    offense_code_extension TEXT,
    top_traffic_accident_offense TEXT,
    first_occurrence_date TIMESTAMPTZ,
    last_occurrence_date TIMESTAMPTZ,
    reported_date TIMESTAMPTZ,
    incident_address TEXT,
    geo_x INTEGER,
    geo_y INTEGER,
    geo_lon DOUBLE PRECISION,
    geo_lat DOUBLE PRECISION,
    district_id TEXT,
    precinct_id TEXT,
    neighborhood_id TEXT,
    bicycle_ind INTEGER,
    pedestrian_ind INTEGER,
    harmful_event_seq_1 TEXT,
    harmful_event_seq_2 TEXT,
    harmful_event_seq_3 TEXT,
    road_location TEXT,
    road_description TEXT,
    road_contour TEXT,
    road_condition TEXT,
    light_condition TEXT,
    tu1_vehicle_type TEXT,
    tu1_travel_direction TEXT,
    tu1_vehicle_movement TEXT,
    tu1_driver_action TEXT,
    tu1_driver_humancontribfactor TEXT,
    tu1_pedestrian_action TEXT,
    tu2_vehicle_type TEXT,
    tu2_travel_direction TEXT,
    tu2_vehicle_movement TEXT,
    tu2_driver_action TEXT,
    tu2_driver_humancontribfactor TEXT,
    tu2_pedestrian_action TEXT,
    seriously_injured INTEGER,
    fatalities INTEGER,
    fatality_mode_1 TEXT,
    fatality_mode_2 TEXT,
    seriously_injured_mode_1 TEXT,
    seriously_injured_mode_2 TEXT,
    point_x DOUBLE PRECISION,
    point_y DOUBLE PRECISION,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_311 (
    id SERIAL PRIMARY KEY,
    case_summary TEXT,
    case_status TEXT,
    case_source TEXT,
    case_created_date TIMESTAMPTZ,
    case_created_dttm TEXT,
    case_closed_date TEXT,
    case_closed_dttm TEXT,
    first_call_resolution TEXT,
    customer_zip_code TEXT,
    incident_address_1 TEXT,
    incident_address_2 TEXT,
    incident_intersection_1 TEXT,
    incident_intersection_2 TEXT,
    incident_zip_code TEXT,
    longitude DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    agency TEXT,
    division TEXT,
    major_area TEXT,
    type TEXT,
    topic TEXT,
    council_district INTEGER,
    police_district INTEGER,
    neighborhood TEXT,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_aqi (
    id SERIAL PRIMARY KEY,
    date_observed DATE,
    hour_observed INTEGER,
    local_time_zone TEXT,
    reporting_area TEXT,
    state_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    parameter_name TEXT,
    aqi INTEGER,
    category_number INTEGER,
    category_name TEXT,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_neighborhoods (
    id SERIAL PRIMARY KEY,
    nbhd_id SMALLINT,
    nbhd_name TEXT,
    typology TEXT,
    notes TEXT,
    geojson TEXT,  -- full GeoJSON geometry as text
    shape_area DOUBLE PRECISION,
    shape_length DOUBLE PRECISION,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for raw tables (on ingested_at for snapshot queries)
CREATE INDEX IF NOT EXISTS idx_raw_crime_ingested ON raw_crime (ingested_at);
CREATE INDEX IF NOT EXISTS idx_raw_crashes_ingested ON raw_crashes (ingested_at);
CREATE INDEX IF NOT EXISTS idx_raw_311_ingested ON raw_311 (ingested_at);
CREATE INDEX IF NOT EXISTS idx_raw_aqi_ingested ON raw_aqi (ingested_at);
