# Data Freshness Indicator — Design

**Date:** 2026-03-15
**Status:** Approved

## Problem

Denver Open Data publishes crime and crash records with a 5–7 day reporting lag.
The dashboard pipeline (full refresh, 90-day window) correctly ingests all available
data, but the frontend displays zero values for recent dates where crime/crash records
have not yet been published. This makes the dashboard look broken.

311 Requests (~2 day lag) and AQI (~1 day lag) have shorter delays, so their lines
continue while crime/crashes drop to zero.

## Solution

Trim all time-series data to the last date where **all domains on a given page** have
complete data, and clearly communicate freshness status to the user.

## Design

### Backend

**City Pulse API routes** (`/api/city-pulse/trends`, `/api/city-pulse/kpis`):
- Compute `effectiveThrough` = `MIN(MAX(date))` across three domains (crime, crashes, 311)
  from `mart_incident_trends` within the selected time window.
- Filter trend series and sparkline data to `date <= effectiveThrough`.
- Constrain KPI aggregation window to `effectiveThrough` so averages are not deflated
  by zero-tail days.

**Environment API route** (`/api/environment/aqi`):
- Compute `effectiveThrough` = `MAX(date)` from `mart_aqi_daily` within the time window.
- Filter AQI trend series to `date <= effectiveThrough`.

**Response format** — add two fields to existing API responses:

```json
{
  "data": { ... },
  "lastUpdated": "2026-03-15T06:00:00Z",
  "effectiveThrough": "2026-03-09"
}
```

- `lastUpdated` — timestamp of the API call (confirms the system is alive).
- `effectiveThrough` — last date with complete data (trim boundary).

### Frontend

**Data hooks** (`use-city-pulse-data.ts`, `use-environment-data.ts`):
- Extract `lastUpdated` and `effectiveThrough` from API responses.
- Expose both values to page components.

**Header component** (`components/layout/header.tsx`):
- Replace unused `lastUpdated` prop with two-line freshness display:

```
Pipeline ran: Mar 15, 06:00 UTC
Data complete through: Mar 9
```

- Style: 10px, color `#9FB3C8`, below page subtitle.

**Sidebar** (`components/layout/sidebar.tsx`):
- Replace hardcoded "Data refreshed daily at 06:00 UTC" with dynamic text using
  actual `lastUpdated` value.

**Chart components** — no changes. They render exactly what the API returns.

### What does NOT change

- Pipeline (ingestion, staging, marts) — no modifications.
- HeatmapChart, CategoryChart, NeighborhoodRankingChart — no time axis, unaffected.
- Chart component internals — remain "dumb" renderers.

## Verification

After implementation:
1. Select 30d time window — trend chart should end on the last complete-data date,
   not today.
2. Header should show both pipeline timestamp and effective-through date.
3. KPI totals should match the trimmed date range (no zero-tail deflation).
4. When lagged data arrives (next pipeline run after source catches up), the
   effective-through date should automatically advance.
