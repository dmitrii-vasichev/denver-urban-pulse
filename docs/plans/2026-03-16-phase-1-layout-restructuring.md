# Phase 1: Layout Restructuring

**PRD**: `docs/prd-dashboard-restructuring.md`
**Requirements**: FR-1 through FR-10
**Dependencies**: None (first phase)

---

## Task 1: Remove sidebar, make header top-level

**Description**: Remove Sidebar component from root layout. The existing Header inside PageShell already has title, freshness info, and filters — it becomes the sole navigation/info bar. Remove mobile-nav (hamburger for sidebar drawer). Make header sticky.

**Files to modify**:
- `app/layout.tsx` — remove Sidebar import and flex wrapper, children take full width
- `components/layout/page-shell.tsx` — ensure header is sticky (`sticky top-0 z-10`)
- `components/layout/header.tsx` — add dashboard title "Denver Urban Pulse" (was in sidebar), ensure sticky behavior

**Files to delete**:
- `components/layout/sidebar.tsx`
- `components/layout/sidebar-item.tsx`
- `components/layout/mobile-nav.tsx`

**Acceptance criteria**:
- No sidebar visible on any breakpoint
- Header at top with title "Denver Urban Pulse", filters, and freshness info
- Header sticky on scroll
- No broken imports

**Verify**: `npm run build` passes, visual check at all breakpoints

---

## Task 2: Create unified data hook for single page

**Description**: The main page needs data from both `useCityPulseData` and `useEnvironmentData` hooks. Create a unified hook or simply call both hooks on the main page. The AQI KPI, AQI Trend, and Change Leaders data come from the environment hook.

**Files to modify**:
- `app/page.tsx` — import and call `useEnvironmentData` alongside `useCityPulseData`

**Files to review** (read-only):
- `lib/hooks/use-environment-data.ts` — understand what data it returns (aqi, rankings, comparison, changeLeaders)
- `lib/hooks/use-city-pulse-data.ts` — understand current returns

**Acceptance criteria**:
- Main page has access to: kpis (crime/crashes/311), aqi data, categories, heatmap, changeLeaders, map neighborhoods
- Both hooks called with same timeWindow/neighborhood filters
- Loading/error states from both hooks handled

**Verify**: No TypeScript errors, data loads in dev server

---

## Task 3: Restructure main page — new grid layout

**Description**: Rebuild the main page grid to match the new layout:
- Row 1: KPI Strip — 4 cards (Crime, Crashes, 311, AQI)
- Row 2: Neighborhood Map (60%) + Category Breakdown (40%)
- Row 3: AQI Trend (50%) + Time Heatmap (50%)
- Row 4: Change Leaders (full-width)

Remove from page: Incident Trends, Narrative block, Neighborhood Ranking (Top Neighborhoods).
Add to page: AQI KPI card, AQI Trend chart, Change Leaders chart.

**Files to modify**:
- `app/page.tsx` — new grid layout, add AQI KPI card, add AQI Trend + Change Leaders, remove old hero row and analytics grid

**Component imports to add**:
- `components/charts/aqi-trend-chart.tsx`
- `components/charts/change-leaders-chart.tsx`

**Component imports to remove**:
- `components/charts/trend-chart.tsx` (Incident Trends)
- `components/cards/narrative-block.tsx`
- `components/charts/neighborhood-ranking-chart.tsx`

**Grid structure**:
```
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4   (KPI row)
grid-cols-1 lg:grid-cols-5                    (Map 3-cols + Categories 2-cols)
grid-cols-1 md:grid-cols-2                    (AQI Trend + Heatmap)
full-width                                     (Change Leaders)
```

**Acceptance criteria**:
- 4 KPI cards in top row (Crime, Crashes, 311, AQI)
- Map (60%) next to Category Breakdown (40%) in second row
- AQI Trend next to Time Heatmap in third row
- Change Leaders full-width in fourth row
- No Incident Trends, Narrative, or Neighborhood Ranking visible
- Loading skeletons match new grid structure

**Verify**: `npm run build`, visual check, all charts render with data

---

## Task 4: Delete Environment page and unused components

**Description**: Remove the Environment & Neighborhoods page/route and all components that are no longer imported anywhere.

**Files to delete**:
- `app/environment/page.tsx`
- `app/environment/` directory
- `components/charts/trend-chart.tsx` (Incident Trends — if not imported elsewhere)
- `components/cards/narrative-block.tsx` (if not imported elsewhere)
- `components/charts/neighborhood-ranking-chart.tsx` (if not imported elsewhere)
- `components/charts/neighborhood-comparison-chart.tsx` (if not imported elsewhere)

**Files to modify**:
- Check all imports — ensure nothing references deleted files
- Remove API routes if exclusively used by deleted components (evaluate case-by-case)

**Acceptance criteria**:
- `/environment` route returns 404
- No dead imports or unused component files
- `npm run build` passes with zero warnings about missing modules

**Verify**: `npm run build`, `grep -r` for deleted filenames

---

## Task 5: Update tests

**Description**: Update existing tests to reflect the new single-page layout. Remove tests for deleted components, add basic tests for new layout.

**Files to modify**:
- Tests referencing sidebar, environment page, or removed components
- Add test: main page renders 4 KPI cards
- Add test: main page renders all 6 visualization sections

**Acceptance criteria**:
- `npm test` passes with no failures
- No test files reference deleted components
- Basic coverage for new page layout

**Verify**: `npm test`

---

## Execution Order

```
Task 1 (sidebar → header)
    ↓
Task 2 (unified data on main page)
    ↓
Task 3 (new grid layout)
    ↓
Task 4 (delete dead code)
    ↓
Task 5 (update tests)
```

Tasks 1-3 are sequential (each builds on the previous).
Task 4 depends on Task 3 (need to know what's still imported).
Task 5 is last (needs stable code to test).
