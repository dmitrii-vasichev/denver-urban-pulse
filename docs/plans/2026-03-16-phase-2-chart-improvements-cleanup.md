# Phase 2: Chart Improvements & Cleanup

## Metadata
| Field | Value |
|-------|-------|
| Phase | 2 of 2 |
| PRD | docs/prd-dashboard-restructuring.md |
| Date | 2026-03-16 |
| Status | Draft |

## Scope
Refine chart behavior, unify styling, and remove dead code left after Phase 1 layout restructuring.

## Tasks

### Task 1: Heatmap aggregation SUM → AVG (FR-11)
**Goal:** Time Heatmap should show average incidents per week, not total sum.

**Files to change:**
- `lib/queries/city-pulse.ts` — `getHeatmap()`: change `SUM(count)::int` → `ROUND(AVG(count))::int` in both branches (domain=all and domain-specific)
- `components/charts/heatmap-chart.tsx` — tooltip text: change `"{count} incidents"` → `"Avg per week: {count} incidents"`
- `__tests__/charts.test.tsx` — update heatmap test if tooltip text is verified

**Acceptance criteria:**
- [ ] Heatmap SQL uses AVG instead of SUM
- [ ] Tooltip displays "Avg per week: N incidents"
- [ ] Tests pass

---

### Task 2: Rounded bars on Change Leaders (FR-12)
**Goal:** Change Leaders bar chart should have rounded outer ends, matching Category Breakdown styling.

**Files to change:**
- `components/charts/change-leaders-chart.tsx` — update `radius` prop on `<Bar>`:
  - Horizontal bars: radius should round the outer end (right for positive, left for negative). For Recharts horizontal `<Bar>` with `layout="vertical"`, use `radius={[4, 4, 4, 4]}` for consistent rounding (Recharts applies to outer corners automatically)
- `__tests__/charts-environment.test.tsx` — no changes needed (tests don't verify radius)

**Acceptance criteria:**
- [ ] Change Leaders bars have visibly rounded ends
- [ ] Rounding matches Category Breakdown's `rounded-sm` (2-4px) feel
- [ ] No visual regression in the chart

---

### Task 3: Highlight "Most Improved" in Change Leaders (FR-13)
**Goal:** The neighborhood with the best (most negative) delta should be visually highlighted.

**Files to change:**
- `components/charts/change-leaders-chart.tsx`:
  - In `computeLeaders()`, mark the entry with the lowest delta as `isMostImproved: true`
  - Add a visual badge or accent: render a star icon (★) or "Most Improved" label next to the bar via a custom `<YAxis>` tick, or use a different fill opacity/pattern
  - Alternative: use a brighter green shade (`#0D6E3F`) + bold label for the most improved entry
- Update `LeaderEntry` interface to include `isMostImproved?: boolean`

**Acceptance criteria:**
- [ ] Most Improved neighborhood is visually distinct from other green bars
- [ ] Highlight is clear at a glance (badge, label, or accent color)
- [ ] Test verifies the most improved computation

---

### Task 4: Remove dead code from hooks and API routes (FR-15)
**Goal:** Clean up unused data fetching and API routes that were part of the old two-page layout.

**Dead code identified:**
1. `use-city-pulse-data.ts` fetches `trends` and `narrative` — not used on page
2. `use-environment-data.ts` fetches `rankings` and `narrative` — not used on page
3. API routes that only serve removed content:
   - `app/api/city-pulse/trends/route.ts` — served the removed Incident Trends chart
   - `app/api/city-pulse/narrative/route.ts` — served the removed narrative block
   - `app/api/environment/narrative/route.ts` — served the removed narrative block
   - `app/api/environment/rankings/route.ts` — served the removed Neighborhood Ranking chart
4. Query functions no longer called:
   - `lib/queries/city-pulse.ts` → `getTrends()`, `getNarrativeSignals()`
5. Test files referencing removed routes/data:
   - `__tests__/api-city-pulse.test.ts` — remove trends/narrative tests
   - `__tests__/api-environment.test.ts` — remove rankings/narrative tests
   - `__tests__/page-city-pulse.test.tsx` — remove `trends` from mock return values

**Files to change:**
- `lib/hooks/use-city-pulse-data.ts` — remove trends/narrative fetch and state
- `lib/hooks/use-environment-data.ts` — remove rankings/narrative fetch and state
- Delete: `app/api/city-pulse/trends/route.ts`
- Delete: `app/api/city-pulse/narrative/route.ts`
- Delete: `app/api/environment/narrative/route.ts`
- Delete: `app/api/environment/rankings/route.ts`
- `lib/queries/city-pulse.ts` — remove `getTrends()`, `getNarrativeSignals()` and their types (`TrendRow`, `NarrativeRow`)
- Update test files to remove references to deleted routes/data
- `lib/types.ts` — remove unused types (`TrendPoint`, `NarrativeData` if no longer imported)

**Acceptance criteria:**
- [ ] No unused fetch calls in hooks
- [ ] No orphaned API routes
- [ ] No unused query functions
- [ ] All tests pass
- [ ] Build succeeds with no lint warnings about unused vars

---

### Task 5: Responsive layout verification (FR-14)
**Goal:** Ensure the single-page layout works well on mobile, tablet, and desktop.

**Checks:**
- `app/page.tsx` grid classes: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (KPIs), `grid-cols-1 lg:grid-cols-5` (map+categories), `grid-cols-1 md:grid-cols-2` (AQI+heatmap)
- Header: `flex-col sm:flex-row` — filters stack on mobile
- KPI cards: stack to 1-col on mobile, 2-col on sm, 4-col on lg
- Charts: stack to 1-col on mobile

**Files to change (if issues found):**
- `app/page.tsx` — adjust breakpoints if needed
- `components/layout/header.tsx` — ensure filters don't overflow on small screens

**Acceptance criteria:**
- [ ] KPI cards stack properly on mobile (< 640px)
- [ ] Map and charts go single-column on mobile
- [ ] Header filters wrap correctly
- [ ] No horizontal overflow on any viewport

## Task Order
1. Task 4 (cleanup) — first, to reduce noise and simplify subsequent changes
2. Task 1 (heatmap AVG) — standalone SQL + tooltip change
3. Task 2 (rounded bars) — quick CSS/prop change
4. Task 3 (most improved highlight) — builds on Task 2's chart
5. Task 5 (responsive) — final verification pass

## Estimated Issue Count: 5
