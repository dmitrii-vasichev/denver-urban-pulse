# Phase 2 — Data Pipeline

## Overview
Build the complete data transformation pipeline: staging transformations (raw → staging), mart aggregations (staging → marts), daily cron job, and end-to-end verification. By the end of this phase, the pipeline runs automatically every day and populates all 9 marts with real data ready for the frontend.

## Prerequisites
- Phase 1 complete: database schema deployed, raw ingestion scripts working, all APIs validated.
- Raw tables (`raw_crime`, `raw_crashes`, `raw_311`, `raw_aqi`, `raw_neighborhoods`) contain data from ingestion scripts.

## Tasks

### Task 1: Build staging transformations — crime and crashes — Issue #13
**Description:** Write Python scripts that read from `raw_crime` and `raw_crashes`, clean and normalize the data, resolve neighborhood names via `ref_neighborhoods`, and insert into `stg_crime` and `stg_crashes`. Full refresh strategy (truncate + reload from latest raw snapshot).

**Transformations — Crime:**
- Map `offense_type_id` → `offense_type`, `offense_category_id` → `offense_category`
- Map `geo_lon`/`geo_lat` → `longitude`/`latitude`
- Map `neighborhood_id` → `neighborhood` via `ref_neighborhoods` canonical name lookup
- Cast `victim_count` from DOUBLE to INTEGER
- Filter out records where `is_crime = 0` (traffic offenses already in crashes)
- Drop records with NULL `reported_date`

**Transformations — Crashes:**
- Map `top_traffic_accident_offense` → `top_offense`
- Map `geo_lon`/`geo_lat` → `longitude`/`latitude`
- Map `neighborhood_id` → `neighborhood` via `ref_neighborhoods`
- Convert `bicycle_ind`/`pedestrian_ind` (0/1) → boolean
- Coalesce `seriously_injured`/`fatalities` NULLs to 0
- Drop records with NULL `reported_date`

**Files:**
- `data/staging/transform_crime.py`
- `data/staging/transform_crashes.py`
- `data/staging/db.py` (shared DB utilities, can reuse from ingestion)

**Acceptance Criteria:**
- [ ] `stg_crime` populated with cleaned records, all neighborhoods normalized
- [ ] `stg_crashes` populated with cleaned records, booleans correct
- [ ] Records with NULL dates or invalid data filtered out
- [ ] Neighborhood names match `ref_neighborhoods.canonical_name`
- [ ] Scripts are idempotent (truncate + reload)
- [ ] Tests: verify row counts, data types, neighborhood normalization

**Verification:** Run scripts, query `stg_crime` and `stg_crashes`, verify data integrity.

---

### Task 2: Build staging transformations — 311, AQI, neighborhoods — Issue #14
**Description:** Write Python scripts for the remaining three staging tables.

**Transformations — 311:**
- Map `type` → `request_type`
- Map `incident_address_1` → `incident_address`
- Map `customer_zip_code` → `zip_code`
- Parse `case_closed_dttm` string to TIMESTAMPTZ for `case_closed_date`
- Convert `first_call_resolution` ("Yes"/"No") → boolean
- Map `neighborhood` → normalized via `ref_neighborhoods`
- Drop records with NULL `case_created_date`

**Transformations — AQI:**
- Combine `date_observed` + `hour_observed` + `local_time_zone` → `observed_at` TIMESTAMPTZ
- Map `category_name` → `category`
- Filter to Denver reporting area only
- ON CONFLICT (observed_at, reporting_area, parameter_name) DO UPDATE

**Transformations — Neighborhoods:**
- Parse `geojson` TEXT → JSONB for `geojson` column
- Map fields directly (nbhd_id, nbhd_name, typology, shape_area, shape_length)

**Files:**
- `data/staging/transform_311.py`
- `data/staging/transform_aqi.py`
- `data/staging/transform_neighborhoods.py`

**Acceptance Criteria:**
- [ ] `stg_311` populated with normalized request types and neighborhoods
- [ ] `stg_aqi` populated with proper timestamps, no duplicates
- [ ] `stg_neighborhoods` populated with parsed GeoJSON as JSONB
- [ ] All neighborhood names normalized via `ref_neighborhoods`
- [ ] Scripts are idempotent
- [ ] Tests: verify data quality, timestamp parsing, deduplication

**Verification:** Run scripts, query staging tables, verify completeness.

---

### Task 3: Build staging orchestrator and ref_neighborhoods sync — Issue #15
**Description:** Create an orchestrator script that runs all staging transformations in order. Also build a script to sync `ref_neighborhoods` alternate name columns by discovering actual neighborhood name variants in raw data.

**Neighborhood sync logic:**
- Query distinct `neighborhood_id` from `raw_crime` → populate `ref_neighborhoods.crime_name`
- Query distinct `neighborhood_id` from `raw_crashes` → populate `ref_neighborhoods.crash_name`
- Query distinct `neighborhood` from `raw_311` → populate `ref_neighborhoods.name_311`
- Use fuzzy matching or case-insensitive comparison to map raw names to canonical names

**Files:**
- `data/staging/run_all.py` (orchestrator)
- `data/staging/sync_neighborhoods.py`

**Acceptance Criteria:**
- [ ] `run_all.py` runs all 5 staging transforms + neighborhood sync
- [ ] Partial failure tolerance (one transform failing doesn't block others)
- [ ] Logging with record counts and timing
- [ ] `ref_neighborhoods` alternate name columns populated
- [ ] Tests: orchestrator handles individual script failures gracefully

**Verification:** Run `python data/staging/run_all.py` — all staging tables populated.

---

### Task 4: Build mart layer — daily aggregates and trends — Issue #16
**Description:** Build the first group of marts that power KPI cards and trend charts.

**Marts:**
1. `mart_city_pulse_daily` — aggregate `stg_crime`, `stg_crashes`, `stg_311` by date. Count incidents, sum victims/injuries/fatalities per day.
2. `mart_incident_trends` — daily counts by domain + category. Crime by `offense_category`, crashes by `top_offense`, 311 by `request_type`.
3. `mart_aqi_daily` — pivot `stg_aqi` by parameter_name. For each date: max AQI across parameters, individual ozone/PM2.5/PM10 values, category label.

**Files:**
- `data/marts/build_city_pulse_daily.py`
- `data/marts/build_incident_trends.py`
- `data/marts/build_aqi_daily.py`
- `data/marts/db.py` (shared utilities)

**Acceptance Criteria:**
- [ ] `mart_city_pulse_daily` has one row per date with correct counts
- [ ] `mart_incident_trends` has rows per (date, domain, category)
- [ ] `mart_aqi_daily` has one row per date with pivoted AQI values
- [ ] All marts use UPSERT (ON CONFLICT DO UPDATE) for idempotency
- [ ] Tests: verify aggregation accuracy with known test data

**Verification:** Query marts, cross-check totals against staging tables.

---

### Task 5: Build mart layer — neighborhood analytics and rankings — Issue #17
**Description:** Build the neighborhood-focused marts that power the map, ranking charts, and comparison views.

**Marts:**
1. `mart_city_pulse_neighborhood` — for each (neighborhood, period): count crime/crashes/311, compute total, compute delta_pct vs prior period of same length.
2. `mart_neighborhood_ranking` — for each (period, neighborhood): count by domain, compute composite_score (weighted sum or normalized), assign rank.
3. `mart_neighborhood_comparison` — for each (period, neighborhood): compute rates (per area from `stg_neighborhoods.shape_area`), compute delta_pct vs prior period.

**Delta calculation:** For period "30d" ending today, compare count to the 30d window immediately before (days -60 to -31). Delta = ((current - prior) / prior) * 100.

**Composite score:** Normalize each domain count to 0-1 range across neighborhoods, then sum. Higher = more pressure.

**Files:**
- `data/marts/build_city_pulse_neighborhood.py`
- `data/marts/build_neighborhood_ranking.py`
- `data/marts/build_neighborhood_comparison.py`

**Acceptance Criteria:**
- [ ] `mart_city_pulse_neighborhood` correctly computes period totals and deltas
- [ ] `mart_neighborhood_ranking` ranks neighborhoods with composite score
- [ ] `mart_neighborhood_comparison` computes rates per area and deltas
- [ ] All three periods (7d, 30d, 90d) populated
- [ ] Delta percentages handle zero-count edge cases (no division by zero)
- [ ] Tests: verify delta calculation, ranking order, rate computation

**Verification:** Query marts, verify rankings match manual calculation for sample neighborhoods.

---

### Task 6: Build mart layer — heatmap, category breakdown, narrative signals — Issue #18
**Description:** Build the remaining three marts for specialized chart components and narrative blocks.

**Marts:**
1. `mart_heatmap_hour_day` — for each (period, domain, day_of_week, hour_of_day): count incidents. day_of_week: 0=Mon..6=Sun. Use `first_occurrence_date` (crime/crashes) or `case_created_date` (311) for hour extraction.
2. `mart_category_breakdown` — for each (period, domain, category): count incidents, compute pct_of_total within that domain+period.
3. `mart_narrative_signals` — compute top signals for template narrative:
   - `top_domain`: which domain had largest delta increase
   - `top_neighborhood`: highest composite score neighborhood
   - `top_category`: most frequent category in the top domain
   - `aqi_status`: current AQI level and value
   - `most_improved`: neighborhood with largest negative delta
   - Generate for each period (7d, 30d, 90d)

**Files:**
- `data/marts/build_heatmap.py`
- `data/marts/build_category_breakdown.py`
- `data/marts/build_narrative_signals.py`

**Acceptance Criteria:**
- [ ] `mart_heatmap_hour_day` has 168 rows (7 days × 24 hours) per (period, domain)
- [ ] `mart_category_breakdown` percentages sum to ~100% per (period, domain)
- [ ] `mart_narrative_signals` has meaningful signals for each period
- [ ] Hour/day extraction uses Denver local time (America/Denver)
- [ ] Tests: verify heatmap completeness, percentage math, signal selection logic

**Verification:** Query marts, verify data completeness and accuracy.

---

### Task 7: Build mart orchestrator and full pipeline runner — Issue #19
**Description:** Create a mart orchestrator and a master pipeline runner that executes the complete daily refresh: ingestion → staging → marts.

**Files:**
- `data/marts/run_all.py` (mart orchestrator)
- `data/pipeline/run_daily.py` (master pipeline: ingestion + staging + marts)

**Pipeline order:**
1. Run migrations (idempotent — safe to run every time)
2. Run ingestion (`data/ingestion/run_all.py`)
3. Sync neighborhoods (`data/staging/sync_neighborhoods.py`)
4. Run staging transforms (`data/staging/run_all.py`)
5. Run mart builds (`data/marts/run_all.py`)

**Acceptance Criteria:**
- [ ] `data/marts/run_all.py` builds all 9 marts in correct dependency order
- [ ] `data/pipeline/run_daily.py` runs the complete pipeline end-to-end
- [ ] Partial failure tolerance at each layer
- [ ] Comprehensive logging: start/end times, record counts, errors
- [ ] Exit code 0 if all succeeded, 1 if any step failed
- [ ] Tests: pipeline handles partial failures, logs correctly

**Verification:** Run `python data/pipeline/run_daily.py` — all tables populated with fresh data.

---

### Task 8: Set up Railway cron job for daily refresh — Issue #20
**Description:** Configure Railway to run the daily pipeline automatically. Set up scheduling, environment variables, and failure alerting.

**Configuration:**
- Schedule: daily at 06:00 UTC (midnight Denver time, MDT = UTC-6)
- Command: `python data/pipeline/run_daily.py`
- Environment: `DATABASE_URL`, `AIRNOW_API_KEY`
- Timeout: 30 minutes max

**Files:**
- `data/pipeline/Dockerfile` (or `railway.json` / `Procfile` — depends on Railway setup)
- `data/requirements.txt` (update if new dependencies needed)
- Update `CLAUDE.md` with cron job documentation

**Acceptance Criteria:**
- [ ] Cron job configured on Railway with correct schedule
- [ ] Pipeline runs successfully on Railway (not just locally)
- [ ] Environment variables properly configured
- [ ] Failure logging visible in Railway dashboard
- [ ] Tests: manual trigger of cron job succeeds

**Verification:** Trigger cron manually via Railway, verify all tables updated.

---

### Task 9: End-to-end pipeline verification with real data — Issue #21
**Description:** Run the complete pipeline with real data and verify data quality at every layer. Document the results and any data quirks discovered.

**Verification checklist:**
- [ ] Raw tables: record counts match API responses
- [ ] Staging tables: no NULL neighborhoods where raw had data, dates parsed correctly
- [ ] Mart tables: aggregates match manual spot-checks
- [ ] Delta calculations: mathematically correct for sample neighborhoods
- [ ] Narrative signals: produce meaningful, non-empty text components
- [ ] AQI data: current day or day-1 present, values reasonable (0-500 range)
- [ ] Pipeline completes in < 15 minutes
- [ ] No data loss between layers

**Files:**
- `data/pipeline/verify_pipeline.py` (automated verification script)
- `data/pipeline/pipeline_report.md` (generated verification report)

**Acceptance Criteria:**
- [ ] Verification script checks all layers automatically
- [ ] Report documents record counts, data freshness, and any issues
- [ ] All 9 marts contain data for 7d/30d/90d periods (where applicable)
- [ ] No critical data quality issues
- [ ] Tests: verification script runs without errors

**Verification:** Run `python data/pipeline/verify_pipeline.py` — all checks pass.

---

## Dependencies

```
Task 1 (Staging: crime + crashes) ───────────── independent
Task 2 (Staging: 311 + AQI + neighborhoods) ── independent
Task 3 (Staging orchestrator + nbhd sync) ──── depends on Tasks 1, 2
Task 4 (Marts: daily + trends + AQI) ────────── depends on Task 3
Task 5 (Marts: neighborhood analytics) ──────── depends on Task 3
Task 6 (Marts: heatmap + categories + signals)─ depends on Tasks 4, 5
Task 7 (Pipeline orchestrator) ──────────────── depends on Tasks 4, 5, 6
Task 8 (Railway cron job) ───────────────────── depends on Task 7
Task 9 (E2E verification) ──────────────────── depends on Task 7
```

## Execution Order
1. Tasks 1, 2 can run in parallel
2. Task 3 after Tasks 1, 2
3. Tasks 4, 5 can run in parallel (after Task 3)
4. Task 6 after Tasks 4, 5
5. Task 7 after Task 6
6. Tasks 8, 9 can run in parallel (after Task 7)
