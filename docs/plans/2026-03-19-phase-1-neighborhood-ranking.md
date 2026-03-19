# Phase 1: Neighborhood Ranking + Domain Toggle

## Overview
Add Neighborhood Ranking chart to the left of Change Leaders. Both charts share a Crime/Crashes domain toggle. Remove 311 from Change Leaders.

## Data Flow
- Ranking chart: reuses `neighborhoods: NeighborhoodRow[]` from `useCityPulseData` (already fetched for map). Sort by `crimeCount` or `crashCount` on frontend, take top-5 and bottom-5.
- Change Leaders: reuses `comparison: ComparisonRow[]` from `useEnvironmentData`. Switch from composite delta to `crimeDeltaPct` or `crashDeltaPct` based on selected domain.
- No new API endpoints needed.

## Tasks

### Task 1: Create NeighborhoodRankingChart component
**Files:** `components/charts/neighborhood-ranking-chart.tsx` (new)
**Description:**
- New component with props: `{ data: NeighborhoodRow[]; domain: IncidentDomain }`
- Sort data by `crimeCount` or `crashCount` depending on domain
- Take top-5 (most incidents) and bottom-5 (fewest incidents)
- Render horizontal Recharts BarChart (same pattern as ChangeLeadersChart)
- Bar color: `#2458C6` for crime, `#D97904` for crashes
- Show neighborhood name on Y-axis, count on X-axis
**Acceptance criteria:** Component renders 10 bars (5 highest + 5 lowest) with correct domain color
**Depends on:** none

### Task 2: Refactor ChangeLeadersChart for domain support
**Files:** `components/charts/change-leaders-chart.tsx`
**Description:**
- Add `domain: IncidentDomain` prop
- Update `computeLeaders()`: instead of averaging 3 deltas, use `crimeDeltaPct` or `crashDeltaPct` based on domain
- Remove all 311-related logic from the component
**Acceptance criteria:** Chart shows domain-specific delta; no 311 data in output
**Depends on:** none

### Task 3: Integrate in page.tsx (layout + toggle + tooltip + skeleton)
**Files:** `app/page.tsx`
**Description:**
- Add `bottomRowDomain` state: `useState<IncidentDomain>("crime")`
- Replace full-width Change Leaders with two-column grid (`lg:grid-cols-2`)
- Left column: NeighborhoodRankingChart with `neighborhoods` data + domain
- Right column: ChangeLeadersChart with `comparison` data + domain
- Add shared DomainToggle above or in the row header, controlling both charts
- Update InfoTooltip text for Change Leaders to describe single-domain mode
- Update CityPulseSkeleton to match new two-column layout
**Acceptance criteria:** Both charts render side-by-side; toggle switches both; tooltip is accurate
**Depends on:** Task 1, Task 2

### Task 4: Tests
**Files:** `__tests__/components/neighborhood-ranking-chart.test.tsx` (new), update `__tests__/components/change-leaders-chart.test.tsx`
**Description:**
- NeighborhoodRankingChart: test sorting logic, top-5/bottom-5 selection, domain switching
- ChangeLeadersChart: update existing tests for new domain prop, verify 311 removal
**Acceptance criteria:** All tests pass; ranking logic and domain filtering covered
**Depends on:** Task 1, Task 2

## Execution Order
Task 1 + Task 2 (parallel) → Task 3 → Task 4
