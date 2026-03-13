-- Migration 003: Mart tables
-- Pre-aggregated tables optimized for frontend queries.
-- Each mart serves specific UI components.

-- Daily aggregates across crime, crashes, 311
-- Serves: KPI cards, trend charts
CREATE TABLE IF NOT EXISTS mart_city_pulse_daily (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    crime_count INTEGER DEFAULT 0,
    crash_count INTEGER DEFAULT 0,
    requests_311_count INTEGER DEFAULT 0,
    crime_victim_count INTEGER DEFAULT 0,
    crash_serious_injuries INTEGER DEFAULT 0,
    crash_fatalities INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date)
);

-- Per-neighborhood totals and deltas
-- Serves: Map layer, neighborhood selector
CREATE TABLE IF NOT EXISTS mart_city_pulse_neighborhood (
    id SERIAL PRIMARY KEY,
    neighborhood TEXT NOT NULL,
    period TEXT NOT NULL,  -- '7d', '30d', '90d'
    crime_count INTEGER DEFAULT 0,
    crash_count INTEGER DEFAULT 0,
    requests_311_count INTEGER DEFAULT 0,
    total_incidents INTEGER DEFAULT 0,
    crime_delta_pct DOUBLE PRECISION,  -- vs prior period
    crash_delta_pct DOUBLE PRECISION,
    requests_311_delta_pct DOUBLE PRECISION,
    total_delta_pct DOUBLE PRECISION,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (neighborhood, period)
);

-- Time-series by domain and category
-- Serves: Trend line charts
CREATE TABLE IF NOT EXISTS mart_incident_trends (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    domain TEXT NOT NULL,  -- 'crime', 'crashes', '311'
    category TEXT,         -- offense_category / top_offense / request_type
    count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date, domain, category)
);

-- Incident counts by type/category
-- Serves: Bar/pie charts
CREATE TABLE IF NOT EXISTS mart_category_breakdown (
    id SERIAL PRIMARY KEY,
    period TEXT NOT NULL,  -- '7d', '30d', '90d'
    domain TEXT NOT NULL,
    category TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    pct_of_total DOUBLE PRECISION,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (period, domain, category)
);

-- Hour x day-of-week matrix
-- Serves: Heatmap chart
CREATE TABLE IF NOT EXISTS mart_heatmap_hour_day (
    id SERIAL PRIMARY KEY,
    period TEXT NOT NULL,
    domain TEXT NOT NULL,
    day_of_week SMALLINT NOT NULL,  -- 0=Mon, 6=Sun
    hour_of_day SMALLINT NOT NULL,  -- 0-23
    count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (period, domain, day_of_week, hour_of_day)
);

-- Ranked neighborhoods by composite score
-- Serves: Ranking table/chart
CREATE TABLE IF NOT EXISTS mart_neighborhood_ranking (
    id SERIAL PRIMARY KEY,
    period TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    crime_count INTEGER DEFAULT 0,
    crash_count INTEGER DEFAULT 0,
    requests_311_count INTEGER DEFAULT 0,
    composite_score DOUBLE PRECISION DEFAULT 0,
    rank INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (period, neighborhood)
);

-- Daily AQI observations for Denver
-- Serves: AQI trend, current indicator
CREATE TABLE IF NOT EXISTS mart_aqi_daily (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    aqi_ozone INTEGER,
    aqi_pm25 INTEGER,
    aqi_pm10 INTEGER,
    aqi_max INTEGER,           -- worst of all parameters
    category TEXT,              -- Good/Moderate/Unhealthy/etc
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (date)
);

-- Multi-metric comparison across neighborhoods
-- Serves: Comparison charts, radar chart
CREATE TABLE IF NOT EXISTS mart_neighborhood_comparison (
    id SERIAL PRIMARY KEY,
    period TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    crime_rate DOUBLE PRECISION,     -- per 1000 residents or per area
    crash_rate DOUBLE PRECISION,
    requests_311_rate DOUBLE PRECISION,
    crime_delta_pct DOUBLE PRECISION,
    crash_delta_pct DOUBLE PRECISION,
    requests_311_delta_pct DOUBLE PRECISION,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (period, neighborhood)
);

-- Top signals for template-based narrative
-- Serves: City Pulse Today block, Environment Summary
CREATE TABLE IF NOT EXISTS mart_narrative_signals (
    id SERIAL PRIMARY KEY,
    period TEXT NOT NULL,
    signal_type TEXT NOT NULL,  -- 'top_domain', 'top_neighborhood', 'top_category', 'aqi_status', etc.
    signal_key TEXT,
    signal_value TEXT,
    signal_numeric DOUBLE PRECISION,
    rank INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (period, signal_type, rank)
);

-- Indexes for mart tables
CREATE INDEX IF NOT EXISTS idx_mart_daily_date ON mart_city_pulse_daily (date);
CREATE INDEX IF NOT EXISTS idx_mart_nbhd_period ON mart_city_pulse_neighborhood (period);
CREATE INDEX IF NOT EXISTS idx_mart_trends_date ON mart_incident_trends (date, domain);
CREATE INDEX IF NOT EXISTS idx_mart_aqi_date ON mart_aqi_daily (date);
CREATE INDEX IF NOT EXISTS idx_mart_ranking_period ON mart_neighborhood_ranking (period);
