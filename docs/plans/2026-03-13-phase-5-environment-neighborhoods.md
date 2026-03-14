# Phase 5 — Environment & Neighborhoods Screen

**Date:** 2026-03-13
**Phase:** 5 of 6
**PRD ref:** Section 12.2, Phase 5 (items 19–23)

## Overview

Build the second analytical screen — Environment & Neighborhoods. The page skeleton, all API routes (`/api/environment/*`), database query functions (`lib/queries/environment.ts`), and TypeScript types already exist from prior phases. This phase focuses on:
- Creating the data-fetching hook
- Building 3 new chart components (AQI trend, neighborhood comparison, change leaders)
- Wiring the page with live data
- Adding a 4th KPI card (Most Improved Neighborhood)
- Adding neighborhood map with composite score overlay
- Tests for all new code

## Existing Infrastructure (DO NOT rebuild)

| Asset | Location | Status |
|-------|----------|--------|
| Page skeleton | `app/environment/page.tsx` | Static loading state |
| AQI API route | `app/api/environment/aqi/route.ts` | Done |
| Rankings API route | `app/api/environment/rankings/route.ts` | Done |
| Comparison API route | `app/api/environment/comparison/route.ts` | Done |
| Narrative API route | `app/api/environment/narrative/route.ts` | Done |
| Query functions | `lib/queries/environment.ts` | Done |
| Types | `lib/types.ts` (AqiDailyPoint, AqiCurrent, RankingRow, ComparisonRow) | Done |
| Reusable components | KpiCard, ChartCard, NarrativeBlock, DenverMapDynamic, NeighborhoodRankingChart | Done |

## Tasks

### Task 1: Create `useEnvironmentData` hook

**Description:** Create a client-side data hook that fetches all Environment endpoints in parallel, following the same pattern as `useCityPulseData`.

**Files:**
- `lib/hooks/use-environment-data.ts` (new)

**Details:**
- Fetch 4 endpoints in parallel: `/api/environment/aqi`, `/api/environment/rankings`, `/api/environment/comparison`, `/api/environment/narrative`
- Accept `timeWindow` and `neighborhood` params
- Return: `{ aqi, rankings, comparison, narrative, loading, error }`
- `aqi` should contain both `current: AqiCurrent | null` and `trend: AqiDailyPoint[]`
- Follow `useCityPulseData` pattern exactly (useState, useCallback, useEffect)

**Acceptance Criteria:**
- [ ] Hook exports `useEnvironmentData(timeWindow, neighborhood)`
- [ ] Fetches all 4 API endpoints in parallel
- [ ] Returns typed data matching API response shapes
- [ ] Handles loading and error states
- [ ] Re-fetches on filter changes
- [ ] Tests pass

**Verification:** Unit test with mocked fetch confirms hook returns expected shape and re-fetches on param change.

---

### Task 2: Build AQI Trend chart component

**Description:** Line chart showing AQI values over time with EPA threshold bands (Good / Moderate / Unhealthy).

**Files:**
- `components/charts/aqi-trend-chart.tsx` (new)

**Details:**
- Recharts `AreaChart` or `LineChart` with `ResponsiveContainer`
- X-axis: date, Y-axis: AQI value (0–300 scale)
- Primary line: `aqiMax` (dark blue `#0B4F8C`)
- Optional secondary lines: `aqiPm25`, `aqiOzone` (lighter colors, can be toggled)
- Background reference bands: 0–50 green (Good), 51–100 yellow (Moderate), 101–150 orange (USG), 151+ red (Unhealthy)
- Custom tooltip showing date, AQI value, and category
- Props: `data: AqiDailyPoint[]`
- Empty state: "No AQI data available"

**Acceptance Criteria:**
- [ ] Chart renders AQI trend line with threshold bands
- [ ] Tooltip shows date, value, and category
- [ ] Responsive (fills container)
- [ ] Empty state handled
- [ ] Tests pass (renders without crash, empty state shows message)

**Verification:** Visual check + unit test.

---

### Task 3: Build Neighborhood Comparison chart component

**Description:** Grouped bar chart comparing selected neighborhoods across crime rate, crash rate, and 311 rate.

**Files:**
- `components/charts/neighborhood-comparison-chart.tsx` (new)

**Details:**
- Recharts `BarChart` with grouped bars
- X-axis: neighborhood names (truncated if long)
- 3 bars per neighborhood: crime (blue `#2458C6`), crashes (orange `#D97904`), 311 (green `#198754`)
- Show top 8 neighborhoods by total rate (sorted desc)
- Custom tooltip with all three metrics
- Legend at bottom
- Props: `data: ComparisonRow[]`
- Empty state: "No comparison data available"

**Acceptance Criteria:**
- [ ] Chart renders grouped bars for top 8 neighborhoods
- [ ] Color-coded by domain (crime/crashes/311)
- [ ] Tooltip shows neighborhood name and all three rates
- [ ] Legend visible
- [ ] Empty state handled
- [ ] Tests pass

**Verification:** Visual check + unit test.

---

### Task 4: Build Change Leaders chart component

**Description:** Lollipop/horizontal bar chart showing neighborhoods with largest positive and negative changes vs. prior period.

**Files:**
- `components/charts/change-leaders-chart.tsx` (new)

**Details:**
- Show top 5 movers up (green) and top 5 movers down (red)
- Use composite delta: average of `crimeDeltaPct`, `crashDeltaPct`, `requests311DeltaPct`
- Horizontal bars diverging from 0 center line
- Recharts `BarChart` with `layout="vertical"`, negative values go left, positive go right
- Props: `data: ComparisonRow[]`
- Empty state handled

**Acceptance Criteria:**
- [ ] Shows top 5 increasing and top 5 decreasing neighborhoods
- [ ] Green for decrease (improvement), red for increase (worsening)
- [ ] Diverging from center
- [ ] Tooltip shows neighborhood and delta %
- [ ] Tests pass

**Verification:** Visual check + unit test.

---

### Task 5: Wire Environment page with data fetching

**Description:** Convert the static skeleton page into a fully data-driven page using `useEnvironmentData` hook.

**Files:**
- `app/environment/page.tsx` (modify)

**Details:**
- Add `"use client"` directive
- Import and use `useEnvironmentData` hook
- Wire 4 KPI cards:
  1. Air Quality Index — value: current AQI, color: depends on category, insight from narrative
  2. Safest Neighborhood — value from rankings (lowest composite score), color: green
  3. Most Active Area — value from rankings (highest composite score), color: orange
  4. Most Improved — value from comparison (largest negative composite delta), color: blue
- Wire hero row:
  - Left: AQI Trend chart with data
  - Right: NarrativeBlock with narrative data
- Wire lower analytics (2×2):
  - Neighborhood Rankings (reuse `NeighborhoodRankingChart` from Phase 4 with ranking data)
  - Neighborhood Comparison (new `NeighborhoodComparisonChart`)
  - Neighborhood Map (reuse `DenverMapDynamic` with composite score overlay)
  - Change Leaders (new `ChangeLeadersChart`)
- Add error state and Suspense skeleton (follow City Pulse pattern)
- Integrate `useFilters()` for time window and neighborhood

**Acceptance Criteria:**
- [ ] Page loads with skeleton, then shows real data
- [ ] All 4 KPI cards display correct values from API
- [ ] AQI Trend chart renders with live data
- [ ] Narrative block shows environment summary
- [ ] Rankings chart renders neighborhood data
- [ ] Comparison chart renders grouped bars
- [ ] Map shows neighborhood composite scores
- [ ] Change Leaders chart renders movers
- [ ] Time window filter changes re-fetch data
- [ ] Error state displayed on API failure
- [ ] Tests pass

**Verification:** `npm run build` succeeds, visual check at `/environment`, filter switching works.

---

### Task 6: Add neighborhood map with composite score overlay

**Description:** Add the Denver map to the Environment page showing neighborhoods colored by composite score from rankings data.

**Files:**
- `app/environment/page.tsx` (modify — add map section)

**Details:**
- Reuse `DenverMapDynamic` component
- Pass rankings data converted to `NeighborhoodRow` format (composite score → total for color scale)
- Map sits in the lower analytics 2×2 grid (expand to 2×3 or put map in hero section)
- Tooltip shows: neighborhood name, composite score, rank
- Selected neighborhood filter highlights the area

**Acceptance Criteria:**
- [ ] Map renders with composite score choropleth
- [ ] Tooltip shows neighborhood details
- [ ] Neighborhood filter highlights selected area
- [ ] Tests pass

**Verification:** Visual check, filter interaction.

*Note:* This task may be merged with Task 5 if the map wiring is straightforward.

---

### Task 7: Tests for Environment page and components

**Description:** Write unit tests for all new components and the data hook.

**Files:**
- `__tests__/hooks/use-environment-data.test.ts` (new)
- `__tests__/charts/aqi-trend-chart.test.tsx` (new)
- `__tests__/charts/neighborhood-comparison-chart.test.tsx` (new)
- `__tests__/charts/change-leaders-chart.test.tsx` (new)
- `__tests__/environment-page.test.tsx` (new)

**Details:**
- Hook test: mock fetch, verify data shape, verify re-fetch on param change
- Chart tests: render with sample data, render empty state, no crashes
- Page test: render with mocked hook, verify KPI cards present, verify chart cards present

**Acceptance Criteria:**
- [ ] All new components have at least 1 render test
- [ ] Hook test verifies parallel fetch and error handling
- [ ] `npm test` passes with no failures
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

**Verification:** `npm test -- --verbose` shows all tests passing.

---

## Task Dependencies

```
Task 1 (hook) ─────────────────────────┐
Task 2 (AQI chart) ───────────────────┤
Task 3 (comparison chart) ────────────┼── Task 5 (wire page) ── Task 7 (tests)
Task 4 (change leaders chart) ────────┤
Task 6 (map overlay) ─────────────────┘
```

Tasks 1–4 are independent and can be built in parallel.
Task 5 depends on Tasks 1–4.
Task 6 is part of Task 5 or runs right after.
Task 7 runs last to cover everything.

## Execution Order (sequential)

1. Task 1 — `useEnvironmentData` hook
2. Task 2 — AQI Trend chart
3. Task 3 — Neighborhood Comparison chart
4. Task 4 — Change Leaders chart
5. Task 5 + Task 6 — Wire page with all components + map
6. Task 7 — Tests

## Estimated scope

- 3 new chart components
- 1 new data hook
- 1 page rewrite (skeleton → live)
- ~5–6 test files
- Total: 7 tasks
