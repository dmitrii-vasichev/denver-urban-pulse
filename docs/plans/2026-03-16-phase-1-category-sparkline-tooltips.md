# Phase 1: Category Sparkline Tooltips

## Overview
Add per-category trend sparklines shown in tooltips on hover over Category Breakdown bars.

## Tasks

### Task 1: DB query for category trends
**Description:** Add `getCategoryTrends(tw)` query function to `lib/queries/city-pulse.ts`. Queries `mart_incident_trends` for daily counts grouped by domain + category, filtered by time window. For 90d, aggregate by week (matching KPI sparkline pattern).
**Files:** `lib/queries/city-pulse.ts`
**Acceptance criteria:**
- Returns `{ domain, category, date, count }[]` rows
- Filters by time window (7d/30d daily, 90d weekly)
- Ordered by domain, category, date ASC

### Task 2: API endpoint for category trends
**Description:** Create `/api/city-pulse/category-trends` route. Accepts `timeWindow` param. Calls `getCategoryTrends()`, groups results into `Record<string, Record<string, ChartPoint[]>>` (domain → category → sparkline points).
**Files:** `app/api/city-pulse/category-trends/route.ts`
**Acceptance criteria:**
- GET endpoint returns `{ data: { crime: { "Vehicle Theft": [...], ... }, crashes: {...}, requests311: {...} } }`
- Each sparkline is `ChartPoint[]` (date + value)
- Handles errors with 500 response

### Task 3: Extend hook to preload category trends
**Description:** Add `categoryTrends` to `useCityPulseData` hook. Fetch `/api/city-pulse/category-trends` in parallel with existing requests. Add `CategoryTrends` type to `lib/types.ts`.
**Files:** `lib/types.ts`, `lib/hooks/use-city-pulse-data.ts`
**Acceptance criteria:**
- `categoryTrends: Record<string, Record<string, ChartPoint[]>>` available in hook result
- Fetched in parallel with categories, heatmap, neighborhoods
- Empty object `{}` as default/fallback

### Task 4: CategoryTooltip component + hover logic in CategoryChart
**Description:** Create `CategoryTooltip` component showing full category name, formatted count, percentage, and a non-interactive `<Sparkline />` (height 40px). Add hover state (mouse enter/leave) to CategoryChart bar rows. Tooltip positioned above the hovered bar, clamped to viewport. Fade-in transition via CSS.
**Files:** `components/charts/category-chart.tsx` (tooltip inline or separate component)
**Acceptance criteria:**
- Tooltip appears on hover with: category name, count, percent, sparkline
- Sparkline colored by domain (blue/orange/green)
- Tooltip stays within viewport bounds
- Smooth fade-in transition
- Tooltip hides on mouse leave

### Task 5: Tests
**Description:** Add tests for the new API endpoint and CategoryChart tooltip behavior.
**Files:** `__tests__/category-trends-api.test.ts`, `__tests__/charts.test.tsx`
**Acceptance criteria:**
- API route test: correct grouping of trend data
- CategoryChart test: tooltip renders on hover with expected content
- Existing CategoryChart tests still pass

## Dependency order
```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5
```
All tasks are sequential — each builds on the previous.

## Verification
- `npm run lint` passes
- `npm run build` passes
- `npm test` passes
- Manual verification: hover over bars on dev server, tooltips with sparklines appear
