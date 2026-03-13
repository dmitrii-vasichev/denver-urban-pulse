# Phase 1 — Foundation

## Overview
Set up the project infrastructure: frontend framework, database, data source validation, ingestion scripts, and database schema. By the end of this phase, we have a working Next.js app, a PostgreSQL database with the full schema, and validated connections to all data sources.

## Tasks

### Task 1: Initialize Next.js application — Issue #1
**Description:** Create a Next.js 14+ project with TypeScript, Tailwind CSS, and shadcn/ui. Configure the project structure per PRD Section 24. Set up IBM Plex Sans font. Configure ESLint and basic Tailwind theme with design brief colors.

**Files:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `components/` directory structure
- `lib/` directory structure

**Acceptance Criteria:**
- [ ] `npm run dev` starts the app without errors
- [ ] Tailwind CSS works with design brief color palette configured
- [ ] shadcn/ui is installed and configured
- [ ] IBM Plex Sans is loaded as the primary font
- [ ] ESLint passes with no errors
- [ ] Project structure matches PRD Section 24
- [ ] Tests: basic render test for root page

**Verification:** `npm run dev`, `npm run lint`, `npm test`

---

### Task 2: Set up PostgreSQL on Railway — Issue #2
**Description:** Create a PostgreSQL instance on Railway. Configure connection string as environment variable. Create a database connection utility in the Next.js app. Verify connectivity.

**Files:**
- `.env.local` (gitignored)
- `.env.example`
- `lib/db.ts`

**Acceptance Criteria:**
- [ ] PostgreSQL instance running on Railway
- [ ] `DATABASE_URL` stored in `.env.local`
- [ ] `.env.example` documents required env vars
- [ ] `lib/db.ts` exports a working connection pool
- [ ] Tests: connection health check test

**Verification:** Run connection test, confirm tables can be created.

---

### Task 3: Validate Denver Open Data APIs — Issue #3
**Description:** Write validation scripts that confirm each Denver Open Data endpoint is accessible, returns expected fields, and supports the required query patterns. Document the exact API URLs, field names, and any quirks discovered. Test both ArcGIS REST API and direct download methods.

**Sources to validate:**
- Crime dataset (ArcGIS Feature Service)
- Traffic Accidents (ArcGIS Feature Service)
- 311 Service Requests (ArcGIS Feature Service — check year partitioning)
- Statistical Neighborhoods (GeoJSON boundaries)

**Files:**
- `data/validation/validate_denver_apis.py`
- `data/validation/api_report.md` (generated output)

**Acceptance Criteria:**
- [ ] Each endpoint responds with 200 OK
- [ ] Field names documented for each dataset
- [ ] Record counts and date ranges confirmed
- [ ] 311 year-partitioning behavior documented
- [ ] Neighborhood GeoJSON downloaded and validated
- [ ] API quirks and limitations documented

**Verification:** Run `python data/validation/validate_denver_apis.py` — all checks pass.

---

### Task 4: Validate AirNow API — Issue #4
**Description:** Obtain and test the AirNow API key. Confirm that the API returns AQI data for Denver metro monitoring stations. Document response format, rate limits, and available historical depth.

**Files:**
- `data/validation/validate_airnow.py`

**Acceptance Criteria:**
- [ ] AirNow API key obtained and stored in `.env.local`
- [ ] API returns current AQI for Denver area
- [ ] Historical data availability confirmed (at least 90 days)
- [ ] Rate limits documented
- [ ] Response format documented

**Verification:** Run `python data/validation/validate_airnow.py` — returns valid AQI data.

---

### Task 5: Design and create database schema — Issue #5
**Description:** Create the full three-layer database schema (raw → staging → marts). Write SQL migration scripts. Include the canonical neighborhood mapping table. All 9 mart tables from PRD Section 10.3.

**Schema layers:**
- **Raw:** `raw_crime`, `raw_crashes`, `raw_311`, `raw_aqi`, `raw_neighborhoods` — with `ingested_at` timestamp
- **Staging:** `stg_crime`, `stg_crashes`, `stg_311`, `stg_aqi`, `stg_neighborhoods` — cleaned, normalized
- **Marts:** All 9 from PRD (mart_city_pulse_daily, mart_city_pulse_neighborhood, mart_incident_trends, mart_category_breakdown, mart_heatmap_hour_day, mart_neighborhood_ranking, mart_aqi_daily, mart_neighborhood_comparison, mart_narrative_signals)
- **Reference:** `ref_neighborhoods` — canonical neighborhood name mapping

**Files:**
- `data/migrations/001_raw_tables.sql`
- `data/migrations/002_staging_tables.sql`
- `data/migrations/003_mart_tables.sql`
- `data/migrations/004_reference_tables.sql`
- `data/migrations/run_migrations.py`

**Acceptance Criteria:**
- [ ] All raw tables created with appropriate columns and types
- [ ] All staging tables created with normalized schema
- [ ] All 9 mart tables created per PRD Section 10.3
- [ ] Reference neighborhood mapping table created
- [ ] Migration script runs idempotently (CREATE IF NOT EXISTS)
- [ ] Tests: migration script runs without errors on clean database

**Verification:** Run `python data/migrations/run_migrations.py` — all tables created. Verify with `\dt` in psql.

---

### Task 6: Build ingestion scripts (raw layer) — Issue #6
**Description:** Write Python scripts to fetch data from each source and store in raw tables. Each script handles one data source. Include error handling, logging, and partial failure tolerance (one source failing doesn't block others).

**Files:**
- `data/ingestion/ingest_crime.py`
- `data/ingestion/ingest_crashes.py`
- `data/ingestion/ingest_311.py`
- `data/ingestion/ingest_aqi.py`
- `data/ingestion/ingest_neighborhoods.py`
- `data/ingestion/run_all.py` (orchestrator)
- `data/requirements.txt`

**Acceptance Criteria:**
- [ ] Each script fetches data from its source API
- [ ] Data stored in corresponding raw table with `ingested_at` timestamp
- [ ] Logging: success/failure for each source
- [ ] Partial failure: one source down doesn't crash the orchestrator
- [ ] `run_all.py` executes all ingestion scripts in sequence
- [ ] Tests: mock API responses, verify data stored correctly

**Verification:** Run `python data/ingestion/run_all.py` — data appears in raw tables.

---

## Dependencies

```
Task 1 (Next.js init) ──────────────────────────── independent
Task 2 (PostgreSQL) ────────────────────────────── independent
Task 3 (Denver APIs validation) ────────────────── independent
Task 4 (AirNow validation) ─────────────────────── independent
Task 5 (DB schema) ─────────────────────────────── depends on Task 2
Task 6 (Ingestion scripts) ─────────────────────── depends on Task 2, 3, 4, 5
```

## Execution Order
1. Tasks 1, 2, 3, 4 can run in parallel
2. Task 5 after Task 2
3. Task 6 after Tasks 2, 3, 4, 5
