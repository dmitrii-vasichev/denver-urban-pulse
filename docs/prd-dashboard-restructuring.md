# PRD: Dashboard Restructuring — Single-Page Layout

## Metadata
| Field | Value |
|-------|-------|
| Author | Dmitry Vasichev |
| Date | 2026-03-16 |
| Status | Approved |
| Priority | P0 |

## Problem Statement
The current two-tab dashboard (City Pulse + Environment & Neighborhoods) has several issues:
1. **Duplicated visualizations** — Neighborhood Map and Neighborhood Ranking appear on both tabs identically.
2. **Ineffective chart** — Incident Trends combines three unrelated data series (311 ~1500/day, Crime ~150/day, Crashes ~30/day) on one chart, making smaller series invisible.
3. **Vanity KPIs** — "Safest Neighborhood", "Most Active Area", and "Most Improved" are not actionable.
4. **Redundant narrative blocks** — restate what's already visible in KPI cards.
5. **Unnecessary sidebar** — with a single page, sidebar navigation adds no value and wastes horizontal space.
6. After removing duplicates and low-value content, there isn't enough unique content to justify two tabs.

## User Scenarios

### Scenario 1: Daily check-in
**As a** Denver resident, **I want to** see city safety and environmental metrics on one page, **so that** I can quickly understand how Denver is doing today.

### Scenario 2: Neighborhood investigation
**As a** Denver resident, **I want to** see which neighborhoods are improving or deteriorating, **so that** I can understand trends in my area.

## Functional Requirements

### P0 (Must Have)

- [ ] FR-1: Consolidate dashboard into a single page — remove Environment tab and sidebar navigation
- [ ] FR-2: Replace sidebar with a top header bar containing: dashboard title, data freshness info (pipeline run time, "data complete through" date, refresh schedule), and global filters (time window + neighborhood)
- [ ] FR-3: Remove Incident Trends chart (multi-line crime/crashes/311)
- [ ] FR-4: Remove both Narrative blocks (City Pulse Today, Environment Today)
- [ ] FR-5: Remove Neighborhood Ranking chart from both tabs (stacked bars, duplicated)
- [ ] FR-6: Remove Neighborhood Comparison chart (grouped bars — duplicates Ranking in different format)
- [ ] FR-7: Remove KPI cards: "Safest Neighborhood", "Most Active Area", "Most Improved"
- [ ] FR-8: Add AQI KPI card to the main KPI strip (4 cards total: Crime, Crashes, 311, AQI)
- [ ] FR-9: Move AQI Trend chart and Change Leaders chart to the single page
- [ ] FR-10: Implement new layout grid:
  - Row 1: KPI Strip (4 cards)
  - Row 2: Neighborhood Map (60%) + Category Breakdown (40%)
  - Row 3: AQI Trend (50%) + Time Heatmap (50%)
  - Row 4: Change Leaders (full-width)
- [ ] FR-11: Change Time Heatmap aggregation from SUM to AVG (average per week). Tooltip should display "Avg per week: N incidents"
- [ ] FR-12: Unify bar chart styling — apply rounded bar ends to Change Leaders chart (match Category Breakdown style). Round outer ends only (not axis side)
- [ ] FR-13: Highlight "Most Improved" neighborhood in Change Leaders chart (badge, accent color, or visual emphasis on the top improver bar)

### P1 (Should Have)

- [ ] FR-14: Ensure responsive layout — KPI cards stack on mobile, charts go single-column
- [ ] FR-15: Clean up unused components, API routes, and hooks related to removed visualizations

## Non-Functional Requirements
- Performance: page load should not regress (fewer components = faster expected)
- Accessibility: maintain existing contrast ratios and ARIA labels
- Tests: update existing tests to reflect new layout, remove tests for deleted components

## Technical Notes
- Sidebar component (`components/layout/sidebar.tsx`) to be replaced with a top header
- Environment page (`app/environment/page.tsx`) to be deleted
- Data freshness info currently in sidebar footer — relocate to new top header
- AQI data hook (`lib/hooks/use-environment-data.ts`) still needed for AQI KPI and AQI Trend
- Heatmap API endpoint needs to return AVG instead of SUM (or compute client-side by dividing by number of weeks in the window)
- Change Leaders chart (`components/charts/change-leaders-chart.tsx`) — add `radius` prop to Recharts `<Bar>` component

## Out of Scope
- Adding new data sources or metrics
- Redesigning KPI card internals
- Changing color palette or typography
- Mobile-specific navigation (hamburger menu) — deferred
- Map interactivity improvements

## Acceptance Criteria
- [ ] AC-1: Dashboard renders as a single page with no tab navigation
- [ ] AC-2: No sidebar — header at top with title, freshness info, and filters
- [ ] AC-3: Layout matches the specified grid (4 rows as defined in FR-10)
- [ ] AC-4: Time Heatmap shows averages, tooltip confirms "Avg per week"
- [ ] AC-5: Change Leaders bars have rounded ends matching Category Breakdown style
- [ ] AC-6: "Most Improved" neighborhood is visually highlighted in Change Leaders
- [ ] AC-7: All removed components have no remaining imports or dead code
- [ ] AC-8: Existing tests pass, new layout has basic test coverage
