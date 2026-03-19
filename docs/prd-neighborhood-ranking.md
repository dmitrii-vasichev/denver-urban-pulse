# PRD: Neighborhood Ranking Chart + Domain Toggle

## Metadata
| Field | Value |
|-------|-------|
| Author | Dmitry Vasichev |
| Date | 2026-03-19 |
| Status | Approved |
| Priority | P1 |

## Overview
Add a Neighborhood Ranking chart alongside the existing Change Leaders chart in the bottom row of the City Pulse dashboard. The Ranking chart shows the absolute current state (top-5 most dangerous / top-5 safest neighborhoods), while Change Leaders shows dynamics (most improved / most worsened). Both charts share a single Crime/Crashes domain toggle. The 311 domain is removed from both charts entirely.

## Requirements
- [ ] FR-1: Add Neighborhood Ranking horizontal bar chart showing top-5 most problematic and top-5 safest neighborhoods by incident count for the selected domain
- [ ] FR-2: Place Ranking on the left, Change Leaders on the right in a two-column layout (replace current full-width Change Leaders)
- [ ] FR-3: Add a shared Crime/Crashes domain toggle controlling both charts
- [ ] FR-4: Bar colors follow domain palette — blue (#2458C6) for Crime, orange (#D97904) for Crashes
- [ ] FR-5: Update Change Leaders to show domain-specific delta_pct (crime_delta_pct or crash_delta_pct) instead of composite average
- [ ] FR-6: Remove 311 data from Change Leaders calculation entirely
- [ ] FR-7: Update Change Leaders info tooltip to reflect single-domain mode
- [ ] FR-8: Ranking is computed on the frontend — sort existing mart data by crime_count or crash_count, take top-5 and bottom-5

## Implementation Phases

### Phase 1: Neighborhood Ranking + Domain Toggle (single phase)
- FR-1 through FR-8 — all requirements delivered together
- 4 tasks: new chart component, refactor Change Leaders, integrate in layout, tests
- Plan: `docs/plans/2026-03-19-phase-1-neighborhood-ranking.md`

## Out of Scope
- 311 domain in bottom row charts
- Composite "All domains" mode
- Backend/pipeline changes to mart_neighborhood_ranking
- New API endpoints (reuse existing neighborhood comparison data)

## Technical Notes
- Data source: `mart_neighborhood_ranking` (crime_count, crash_count per neighborhood per period) and `mart_neighborhood_comparison` (delta_pct per domain)
- Frontend sorting of ~78 neighborhoods is negligible — no need for backend ranking
- Shared toggle state managed via React useState in page.tsx, passed to both chart components
- Follow existing design-brief.md patterns: ChartCard wrapper, 14px radius, domain colors
