# Phase 4 — City Pulse Screen

## Overview
Build the City Pulse screen — the primary dashboard view showing Denver's operational pulse across crime, traffic crashes, and 311 requests. This phase fills the placeholder grid from Phase 3 with real chart components, an interactive map, narrative block, and live data fetching. All API routes and query functions already exist from Phase 3.

## Prerequisites
- Phase 3 complete: app shell, sidebar, header with filters, KPI/Chart/Narrative card components, all API routes.
- Mart tables populated with real data (Phase 2).
- Design brief (`docs/design-brief.md`) and Pencil mockup (`docs/design/denver-urban-pulse-design.pen`) are visual references.
- Recharts, Leaflet, React Leaflet already installed.

## Tasks

### Task 1: Add Denver neighborhood GeoJSON boundaries — Issue #49
**Description:** Fetch the Denver Statistical Neighborhoods GeoJSON from Denver Open Data and add it to the project. This is required for the interactive map in Task 6. Normalize neighborhood names to match the `stg_neighborhoods` table.

**Files:**
- `data/geo/denver-neighborhoods.json` (GeoJSON FeatureCollection)
- `data/pipeline/fetch_geojson.py` (one-time fetch script, optional)

**Acceptance Criteria:**
- [ ] GeoJSON file contains all Denver statistical neighborhoods as Polygon/MultiPolygon features
- [ ] Each feature has a `name` property matching `stg_neighborhoods.nbhd_name`
- [ ] File is valid GeoJSON (parseable by Leaflet)
- [ ] File size is reasonable (< 2 MB)
- [ ] `npm run build` passes

**Verification:** `npm run build`, validate JSON structure.

---

### Task 2: Build incident trend line chart — Issue #50
**Description:** Create a multi-line time series chart showing crime, crashes, and 311 requests over the selected time window. Uses Recharts `LineChart` with three color-coded series. Supports tooltip with date + all three values.

**Data source:** `GET /api/city-pulse/trends?timeWindow=X`

**Design specs:**
- Three lines: Crime (#2458C6), Crashes (#D97904), 311 (#198754)
- X-axis: dates (formatted short), Y-axis: incident count
- Tooltip: shows date + all three values
- Legend at bottom
- Responsive (fills ChartCard container)

**Files:**
- `components/charts/trend-chart.tsx`

**Acceptance Criteria:**
- [ ] Renders three lines with correct domain colors
- [ ] Tooltip shows formatted date and all three values
- [ ] Responsive — fills parent container width
- [ ] Handles empty data gracefully (shows "No data" message)
- [ ] Tests: renders with sample data, handles empty array

**Verification:** `npm run lint && npm test`

---

### Task 3: Build category breakdown chart — Issue #51
**Description:** Create a category breakdown visualization showing incident type proportions. Uses Recharts `BarChart` (horizontal bars) or `PieChart` with domain-specific data. Shows top categories per domain with counts and percentages.

**Data source:** `GET /api/city-pulse/categories?timeWindow=X`

**Design specs:**
- Horizontal bar chart (preferred for readability) or donut chart
- Grouped by domain (crime, crashes, 311) with domain colors
- Show category name + count + percentage
- Top 5-8 categories per domain, rest grouped as "Other"
- Subtle grid lines, clean labels

**Files:**
- `components/charts/category-chart.tsx`

**Acceptance Criteria:**
- [ ] Displays top categories with correct proportions
- [ ] Domain colors match design brief (Crime blue, Crashes orange, 311 green)
- [ ] Tooltip shows category name, count, and percentage
- [ ] Responsive layout
- [ ] Tests: renders with sample data, handles empty data

**Verification:** `npm run lint && npm test`

---

### Task 4: Build hour × day heatmap chart — Issue #52
**Description:** Create a heatmap showing incident intensity by hour of day (rows: 0-23) and day of week (columns: Mon-Sun). Uses a grid of colored cells — darker = more incidents. This is a custom component using either Recharts ScatterChart with custom shapes or a pure CSS/SVG grid.

**Data source:** `GET /api/city-pulse/heatmap?timeWindow=X`

**Design specs:**
- Grid: 7 columns (Mon–Sun) × 24 rows (0:00–23:00)
- Color scale: light (#EEF3F8) to dark (#0B4F8C) based on count
- Cell tooltip: day, hour, count
- Axis labels: day names (top), hour labels (left, show every 3 hours)
- Compact size — fits in a ChartCard

**Files:**
- `components/charts/heatmap-chart.tsx`

**Acceptance Criteria:**
- [ ] Renders 7×24 grid with correct color intensity
- [ ] Color scale maps linearly from min to max count
- [ ] Tooltip shows day name, hour, and incident count
- [ ] Axis labels are readable and correctly positioned
- [ ] Responsive — scales with container
- [ ] Tests: renders with sample data, handles empty data

**Verification:** `npm run lint && npm test`

---

### Task 5: Build neighborhood ranking bar chart — Issue #53
**Description:** Create a horizontal bar chart ranking top neighborhoods by combined incident count. Shows top 10 neighborhoods sorted by total incidents (crime + crashes + 311). Each bar is segmented or stacked by domain.

**Data source:** `GET /api/city-pulse/neighborhoods?timeWindow=X`

**Design specs:**
- Horizontal bars, sorted descending by total
- Stacked segments: Crime (#2458C6), Crashes (#D97904), 311 (#198754)
- Neighborhood name on Y-axis (left)
- Tooltip: neighborhood name + breakdown by domain
- Show delta percentage badge next to each bar (optional)
- Top 10 neighborhoods only

**Files:**
- `components/charts/neighborhood-ranking-chart.tsx`

**Acceptance Criteria:**
- [ ] Displays top 10 neighborhoods ranked by total incidents
- [ ] Stacked bars show domain breakdown with correct colors
- [ ] Tooltip shows neighborhood + domain counts
- [ ] Sorted descending by total
- [ ] Responsive layout
- [ ] Tests: renders with sample data, handles empty data

**Verification:** `npm run lint && npm test`

---

### Task 6: Build interactive Denver neighborhood map — Issue #54
**Description:** Create an interactive choropleth map of Denver neighborhoods using React Leaflet. Color-codes neighborhoods by incident density. Supports zoom, pan, and hover tooltips showing neighborhood name and stats.

**Data sources:**
- GeoJSON from `data/geo/denver-neighborhoods.json` (Task 1)
- `GET /api/city-pulse/neighborhoods?timeWindow=X`

**Design specs:**
- Choropleth: neighborhoods colored by total incident density
- Color scale: light (#EEF3F8) to accent (#0B4F8C)
- Tooltip on hover: neighborhood name, crime/crash/311 counts, delta %
- Map center: Denver (~39.74, -104.99), zoom ~11
- Tile layer: CartoDB Positron (light, clean, matches design)
- No map controls clutter — minimal zoom buttons
- Selected neighborhood (from filter) highlighted with border

**Files:**
- `components/map/denver-map.tsx`
- `components/map/neighborhood-layer.tsx` (GeoJSON overlay with styling)

**Acceptance Criteria:**
- [ ] Map renders centered on Denver with neighborhood boundaries
- [ ] Choropleth coloring reflects incident density data
- [ ] Hover tooltip shows neighborhood name + key stats
- [ ] Selected neighborhood from filter is highlighted
- [ ] Map is responsive (fills container)
- [ ] Dynamic import with `ssr: false` (Leaflet requires browser APIs)
- [ ] Leaflet CSS imported correctly
- [ ] Tests: component renders without SSR errors, handles missing GeoJSON

**Verification:** `npm run lint && npm test`, visual check in dev server.

---

### Task 7: Wire City Pulse page with data fetching — Issue #55
**Description:** Update `app/page.tsx` to fetch data from all City Pulse API routes and pass it to the chart components. Replace all placeholder/loading states with real data-driven components. Handle loading, error, and empty states.

**Data fetching approach:**
- Client-side fetching with `useEffect` + `useState` (or SWR/fetch wrappers)
- All fetches use current filter state (timeWindow, neighborhood) from `useFilters()` hook
- Re-fetch when filters change
- Show skeleton loaders while fetching, error messages on failure

**Page sections to wire:**
1. KPI Row (3 cards): fetch `/api/city-pulse/kpis` → populate KpiCard props
2. Hero Left: TrendChart → fetch `/api/city-pulse/trends`
3. Hero Right: NarrativeBlock → fetch `/api/city-pulse/narrative`
4. Lower Grid:
   - CategoryChart → fetch `/api/city-pulse/categories`
   - HeatmapChart → fetch `/api/city-pulse/heatmap`
   - DenverMap → fetch `/api/city-pulse/neighborhoods` + static GeoJSON
   - NeighborhoodRankingChart → fetch `/api/city-pulse/neighborhoods` (same data)

**Files:**
- `app/page.tsx` (major update)
- `lib/hooks/use-city-pulse-data.ts` (custom hook encapsulating all fetches)

**Acceptance Criteria:**
- [ ] All 6 API routes called with correct filter parameters
- [ ] KPI cards show real values, deltas, sparklines, and insights
- [ ] All 4 chart components render with real data
- [ ] Map renders with real neighborhood data
- [ ] Narrative block shows template-generated text
- [ ] Loading skeletons shown during fetch
- [ ] Error state handled gracefully (show message, don't crash)
- [ ] Filters (timeWindow, neighborhood) trigger re-fetch
- [ ] No console errors or warnings
- [ ] Tests: page renders, data hook returns correct structure, loading states work

**Verification:** `npm run lint && npm run build && npm test`, visual check with dev server connected to database.

---

## Dependencies

```
Task 1 (GeoJSON)              ── independent (do first)
Task 2 (Trend chart)          ── independent
Task 3 (Category chart)       ── independent
Task 4 (Heatmap chart)        ── independent
Task 5 (Ranking chart)        ── independent
Task 6 (Denver map)           ── depends on Task 1 (GeoJSON)
Task 7 (Wire page)            ── depends on Tasks 2, 3, 4, 5, 6
```

## Execution Order
1. Task 1 (GeoJSON) — do first, unlocks Task 6
2. Tasks 2, 3, 4, 5 — all independent, can run in parallel
3. Task 6 (Map) — after Task 1
4. Task 7 (Wire page) — after all chart components are built
