# Phase 3 — Frontend Shell

## Overview
Build the frontend application shell: sidebar navigation, header with filters, reusable UI components (KPI card, chart card, narrative block), loading/empty states, API routes reading from marts, and responsive layout. By the end of this phase, the app has a fully functional shell with real data flowing from the database through API routes into placeholder components, ready for Phase 4 (City Pulse screen) and Phase 5 (Environment screen) to fill in the actual charts and map.

## Prerequisites
- Phase 1 complete: Next.js app initialized, PostgreSQL connected, design tokens configured.
- Phase 2 complete: all 9 marts populated with real data, daily pipeline running.
- Design brief (`docs/design-brief.md`) defines all visual specifications.
- Pencil mockup (`docs/design/denver-urban-pulse-design.pen`) is the visual reference.

## Tasks

### Task 1: Install chart and utility dependencies — Issue #31
**Description:** Install Recharts (chart library), react-leaflet + leaflet (map library, needed in Phase 4 but install now to avoid dependency conflicts later), and date-fns (date formatting/manipulation). Add TypeScript type definitions for Leaflet.

**Files:**
- `package.json` (updated dependencies)

**Acceptance Criteria:**
- [ ] `recharts` installed and importable
- [ ] `leaflet`, `react-leaflet`, `@types/leaflet` installed
- [ ] `date-fns` installed
- [ ] `npm run build` passes with new dependencies
- [ ] Tests pass after installation

**Verification:** `npm run build && npm test`

---

### Task 2: Define TypeScript types and format utilities — Issue #32
**Description:** Create shared TypeScript interfaces for all data shapes used across the app (KPI data, chart data, narrative signals, neighborhood list, API responses). Create formatting utilities for numbers, deltas, dates, and AQI values.

**Types to define:**
- `KpiData` — value, delta, deltaPercent, sparkline points, insight, tag
- `ChartPoint` — date, value (generic time series point)
- `NarrativeData` — title, content, stats array
- `NarrativeSignal` — signalType, signalKey, signalValue, signalNumeric
- `NeighborhoodInfo` — name, id
- `TimeWindow` — `'7d' | '30d' | '90d'`
- `ApiResponse<T>` — generic wrapper with `data`, `lastUpdated`, `error`

**Format utilities:**
- `formatNumber(n)` — adds commas (1234 → "1,234")
- `formatDelta(pct)` — "+12.3%" or "−5.1%" with sign
- `formatDate(date)` — "Mar 13, 2026"
- `formatDateShort(date)` — "Mar 13"
- `formatAqi(value)` — returns { value, label, level } (Good/Moderate/Unhealthy etc.)
- `cn()` — already exists in `lib/utils.ts`

**Files:**
- `lib/types.ts`
- `lib/format.ts`

**Acceptance Criteria:**
- [ ] All types exported and usable across components
- [ ] Format functions handle edge cases (null, undefined, zero, negative)
- [ ] `formatAqi` returns correct EPA AQI breakpoints
- [ ] Tests: unit tests for all format functions
- [ ] No lint errors

**Verification:** `npm run lint && npm test`

---

### Task 3: Build API routes — shared endpoints — Issue #33
**Description:** Create the shared API routes that serve neighborhood list, health/status information, and last-update metadata. These are consumed by filters and status indicators across both screens.

**Routes:**
1. `GET /api/shared/neighborhoods` — query `stg_neighborhoods` for dropdown list
   - Response: `{ data: [{ name: string }], lastUpdated: string }`

2. `GET /api/shared/health` — check database connectivity + latest mart update timestamps
   - Response: `{ ok: boolean, lastUpdated: string, sources: { crime: string, crashes: string, 311: string, aqi: string } }`

**Files:**
- `app/api/shared/neighborhoods/route.ts`
- `app/api/shared/health/route.ts`
- `lib/queries/shared.ts` (query functions)

**Acceptance Criteria:**
- [ ] `/api/shared/neighborhoods` returns list of all neighborhoods sorted alphabetically
- [ ] `/api/shared/health` returns database status and latest update timestamps
- [ ] Proper error handling — returns 500 with error message if DB is down
- [ ] Response includes `Cache-Control` headers (revalidate every 1 hour for neighborhoods, 5 min for health)
- [ ] Tests: mock db, verify response shapes, verify error handling

**Verification:** `npm run lint && npm test`, then `curl` endpoints locally.

---

### Task 4: Build API routes — City Pulse endpoints — Issue #34
**Description:** Create the API routes that serve the City Pulse screen data. Each route reads from the appropriate mart table(s) and returns JSON.

**Routes:**
1. `GET /api/city-pulse/kpis?timeWindow=30d&neighborhood=all`
   - Reads: `mart_city_pulse_daily` (sparkline), `mart_city_pulse_neighborhood` (totals + deltas)
   - Response: `{ data: { crime: KpiData, crashes: KpiData, requests311: KpiData }, lastUpdated: string }`

2. `GET /api/city-pulse/trends?timeWindow=90d&neighborhood=all`
   - Reads: `mart_incident_trends`
   - Response: `{ data: { series: [{ date, crime, crashes, requests311 }] }, lastUpdated: string }`

3. `GET /api/city-pulse/categories?timeWindow=30d`
   - Reads: `mart_category_breakdown`
   - Response: `{ data: { crime: [...], crashes: [...], requests311: [...] }, lastUpdated: string }`

4. `GET /api/city-pulse/heatmap?timeWindow=30d&domain=all`
   - Reads: `mart_heatmap_hour_day`
   - Response: `{ data: [{ dayOfWeek, hourOfDay, count }], lastUpdated: string }`

5. `GET /api/city-pulse/neighborhoods?timeWindow=30d`
   - Reads: `mart_city_pulse_neighborhood`
   - Response: `{ data: [{ neighborhood, crimeCount, crashCount, ..., totalDeltaPct }], lastUpdated: string }`

6. `GET /api/city-pulse/narrative?timeWindow=30d`
   - Reads: `mart_narrative_signals`
   - Response: `{ data: NarrativeData, lastUpdated: string }`

**Files:**
- `app/api/city-pulse/kpis/route.ts`
- `app/api/city-pulse/trends/route.ts`
- `app/api/city-pulse/categories/route.ts`
- `app/api/city-pulse/heatmap/route.ts`
- `app/api/city-pulse/neighborhoods/route.ts`
- `app/api/city-pulse/narrative/route.ts`
- `lib/queries/city-pulse.ts` (all query functions for City Pulse)

**Acceptance Criteria:**
- [ ] All 6 routes return valid JSON with correct shapes
- [ ] `timeWindow` query parameter filters data correctly (default: `30d`)
- [ ] `neighborhood` query parameter filters when provided (default: `all`)
- [ ] KPI sparkline returns last N daily values (N=7 for 7d, N=30 for 30d, N=30 for 90d)
- [ ] Delta percentages come directly from mart data
- [ ] Narrative route assembles template text from `mart_narrative_signals`
- [ ] Proper error handling for invalid params and DB errors
- [ ] Tests: mock db queries, verify response shapes for each route

**Verification:** `npm run lint && npm test`

---

### Task 5: Build API routes — Environment endpoints — Issue #35
**Description:** Create the API routes that serve the Environment & Neighborhoods screen.

**Routes:**
1. `GET /api/environment/aqi?timeWindow=30d`
   - Reads: `mart_aqi_daily`
   - Response: `{ data: { current: { aqi, category }, trend: [{ date, aqiMax, aqiOzone, aqiPm25, aqiPm10, category }] }, lastUpdated: string }`

2. `GET /api/environment/rankings?timeWindow=30d`
   - Reads: `mart_neighborhood_ranking`
   - Response: `{ data: [{ neighborhood, crimeCount, crashCount, requests311Count, compositeScore, rank }], lastUpdated: string }`

3. `GET /api/environment/comparison?timeWindow=30d&neighborhoods=Five+Points,Capitol+Hill`
   - Reads: `mart_neighborhood_comparison`
   - Response: `{ data: [{ neighborhood, crimeRate, crashRate, requests311Rate, crimeDeltaPct, ... }], lastUpdated: string }`

4. `GET /api/environment/narrative?timeWindow=30d`
   - Reads: `mart_narrative_signals` (AQI-related signals)
   - Response: `{ data: NarrativeData, lastUpdated: string }`

**Files:**
- `app/api/environment/aqi/route.ts`
- `app/api/environment/rankings/route.ts`
- `app/api/environment/comparison/route.ts`
- `app/api/environment/narrative/route.ts`
- `lib/queries/environment.ts` (query functions)

**Acceptance Criteria:**
- [ ] All 4 routes return valid JSON with correct shapes
- [ ] AQI current value is the latest available date
- [ ] Rankings sorted by composite_score descending
- [ ] Comparison route accepts `neighborhoods` param for filtering specific ones
- [ ] Proper error handling
- [ ] Tests: mock db queries, verify response shapes

**Verification:** `npm run lint && npm test`

---

### Task 6: Build sidebar navigation component — Issue #36
**Description:** Create the sidebar navigation component following the design brief specs. Fixed 240px width, white background, active state styling. Includes app logo/title at the top, navigation links in the middle, and disabled future items.

**Navigation items:**
- City Pulse → `/` (active)
- Environment & Neighborhoods → `/environment` (active)
- Services → disabled (grayed out)
- Daily Brief → disabled (grayed out)

**Responsive behavior:**
- Desktop (≥1280px): full sidebar visible
- Tablet (768–1279px): collapsed sidebar, hamburger toggle
- Mobile (<768px): hidden, hamburger menu opens overlay

**Files:**
- `components/layout/sidebar.tsx`
- `components/layout/sidebar-item.tsx`
- `components/layout/mobile-nav.tsx` (hamburger overlay for mobile)

**Acceptance Criteria:**
- [ ] Sidebar renders with correct width, colors, and typography per design brief
- [ ] Active route highlighted with `#E9F2FF` bg and `#0B4F8C` text
- [ ] Disabled items grayed out (`#9FB3C8`), not clickable, show "Soon" badge
- [ ] Hamburger toggle works on tablet/mobile breakpoints
- [ ] Uses Next.js `Link` component and `usePathname` for active state
- [ ] Tests: renders correctly, active state matches current path, disabled items not navigable

**Verification:** `npm run lint && npm test`, visual check in dev server.

---

### Task 7: Build header with filter controls — Issue #37
**Description:** Create the page header component with title, subtitle, status indicators, and filter controls (time window selector + neighborhood dropdown). The header sits at the top of the main content area (right of sidebar).

**Header sections:**
- Left: page title (dynamic per route) + subtitle with status indicators
- Right: filter controls

**Filter controls:**
- Time window: 3 pill buttons — "7D", "30D" (default), "90D"
  - Active: `#102A43` bg, white text
  - Inactive: `#EEF4FA` bg, `#C7D5E6` border
- Neighborhood dropdown: "All Neighborhoods" default, populated from `/api/shared/neighborhoods`
- Last updated indicator: shows date from `/api/shared/health`

**State management:** Use URL search params for filter state (enables sharing links with filters applied).

**Files:**
- `components/layout/header.tsx`
- `components/layout/time-window-filter.tsx`
- `components/layout/neighborhood-filter.tsx`
- `lib/hooks/use-filters.ts` (custom hook for reading/writing URL search params)

**Acceptance Criteria:**
- [ ] Header renders with correct title per page (City Pulse / Environment & Neighborhoods)
- [ ] Time window pills toggle correctly, update URL params
- [ ] Neighborhood dropdown loads list from API, updates URL params
- [ ] "Last updated" date shown and accurate
- [ ] Filters persist in URL (shareable links)
- [ ] Tests: filter toggle updates params, neighborhood list renders

**Verification:** `npm run lint && npm test`, visual check.

---

### Task 8: Build reusable card components (KPI, Chart, Narrative) — Issue #38
**Description:** Create the three core card components that will be used across both screens. These are presentation-only components — they receive data via props and render it.

**KPI Card:**
- Props: `title`, `tag`, `secondaryTag`, `value`, `delta`, `deltaPercent`, `sparklineData`, `insight`, `color` (domain color), `loading`
- Shows skeleton when `loading=true`
- Sparkline rendered with Recharts `<AreaChart>` (tiny, 80×28px)
- Delta pill: green bg for positive, red for negative

**Chart Card:**
- Props: `title`, `children` (chart content), `insight`, `loading`
- Wrapper component — accepts any chart as children
- Shows skeleton when `loading=true`
- Title bar + chart area + footer insight

**Narrative Block:**
- Props: `title`, `content`, `stats` (array of `{ label, value }`), `loading`
- Dark background card per design brief
- Stat badges in a row at the bottom

**Files:**
- `components/cards/kpi-card.tsx`
- `components/cards/chart-card.tsx`
- `components/cards/narrative-block.tsx`
- `components/ui/skeleton.tsx` (if not already from shadcn)
- `components/ui/delta-badge.tsx` (reusable delta pill)
- `components/ui/sparkline.tsx` (tiny Recharts area chart)

**Acceptance Criteria:**
- [ ] KPI card matches design brief specs (sizes, colors, typography)
- [ ] Sparkline renders smoothly with domain-specific color
- [ ] Delta badge shows correct color and arrow direction
- [ ] Chart card wraps arbitrary content with consistent styling
- [ ] Narrative block renders dark panel with stat badges
- [ ] All three components show loading skeleton when `loading=true`
- [ ] Tests: each component renders with sample props, loading state renders skeleton

**Verification:** `npm run lint && npm test`, visual check.

---

### Task 9: Build app layout and responsive grid — Issue #39
**Description:** Wire everything together: root layout with sidebar + main content area, page-level layouts for City Pulse and Environment screens with the correct grid structure (KPI row → hero row → lower analytics row). Both pages show placeholder content in the correct grid positions, ready for Phase 4 and 5 to fill in real charts.

**Layout structure:**
```
┌──────────┬──────────────────────────────────┐
│          │  Header (title + filters)         │
│ Sidebar  ├──────────────────────────────────┤
│  240px   │  KPI row (3 cards)               │
│          ├──────────────────────────────────┤
│          │  Hero row (60% + 40%)            │
│          ├──────────────────────────────────┤
│          │  Lower analytics (2×2 grid)      │
└──────────┴──────────────────────────────────┘
```

**Responsive:**
- Desktop: sidebar visible, hero row 60/40 split, analytics 2×2
- Tablet: sidebar collapsed, hero row stacked or 50/50, analytics 2×1
- Mobile: no sidebar, everything single column

**Files:**
- `app/layout.tsx` (update — add sidebar, main content wrapper)
- `app/page.tsx` (update — City Pulse with grid layout and placeholder cards)
- `app/environment/page.tsx` (update — Environment with grid layout and placeholder cards)
- `components/layout/page-shell.tsx` (shared page wrapper with header + grid)

**Acceptance Criteria:**
- [ ] Root layout shows sidebar + scrollable main area
- [ ] City Pulse page shows KPI row (3 cards), hero row (2 cols), analytics row (2×2)
- [ ] Environment page shows same structure with different placeholder titles
- [ ] Cards use KPI Card and Chart Card components with sample/placeholder data
- [ ] Responsive layout works at all 3 breakpoints
- [ ] Smooth sidebar toggle animation on tablet/mobile
- [ ] Tests: layout renders, page structure has expected grid areas

**Verification:** `npm run lint && npm run build && npm test`, visual check at 1440px, 1024px, 375px widths.

---

## Dependencies

```
Task 1 (Install dependencies) ──────────────── independent (do first)
Task 2 (Types + format utils) ──────────────── independent
Task 3 (API: shared endpoints) ─────────────── depends on Task 2 (types)
Task 4 (API: City Pulse endpoints) ─────────── depends on Tasks 2, 3
Task 5 (API: Environment endpoints) ────────── depends on Tasks 2, 3
Task 6 (Sidebar navigation) ────────────────── independent
Task 7 (Header + filters) ──────────────────── depends on Task 3 (neighborhoods API)
Task 8 (Card components) ───────────────────── depends on Task 1 (Recharts), Task 2 (types)
Task 9 (App layout + grid) ─────────────────── depends on Tasks 6, 7, 8
```

## Execution Order
1. Task 1 (install deps) — fast, unlocks Task 8
2. Tasks 2, 6 can run in parallel
3. Task 3 after Task 2
4. Tasks 4, 5, 7, 8 can run in parallel (after their deps)
5. Task 9 after Tasks 6, 7, 8 — final integration
