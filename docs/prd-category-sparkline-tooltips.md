# PRD: Category Breakdown Sparkline Tooltips

## Metadata
| Field | Value |
|-------|-------|
| Author | Dmitry Vasichev |
| Date | 2026-03-16 |
| Status | Approved |
| Priority | P1 |

## Overview
Add rich hover tooltips to the Category Breakdown bar chart. When a user hovers over a category bar, a tooltip appears showing the full category name, count, percentage, and an embedded sparkline chart showing the daily trend for that category over the selected time window. This fills a gap — the dashboard currently shows total trends via KPI cards but has no per-category trend visibility.

## User Scenarios
### Scenario 1: Exploring category trends
**As a** dashboard viewer, **I want to** hover over a category bar and instantly see its daily trend, **so that** I can understand whether that category is rising, falling, or stable — without navigating away from the overview.

## Functional Requirements

### P0 (Must Have)
- [ ] FR-1: New API endpoint to return daily sparkline data for all displayed categories (batch), grouped by domain
- [ ] FR-2: Query `mart_incident_trends` table filtered by time window, domain, and top-N categories
- [ ] FR-3: Preload sparkline data for all visible categories when the Category Breakdown card loads (no lazy loading)
- [ ] FR-4: Custom tooltip component appearing on bar hover, containing:
  - Full category name (no truncation)
  - Count (formatted)
  - Percentage
  - Sparkline chart (reusing existing `<Sparkline />` component) colored by domain
- [ ] FR-5: Tooltip positioned near the hovered bar, staying within viewport bounds

### P1 (Should Have)
- [ ] FR-6: Smooth tooltip appearance (fade-in transition)

## Out of Scope
- Click-to-drill-down into a category detail view
- Neighborhood filtering on sparkline data
- Sparkline interactivity within the tooltip (no hover-on-sparkline)

## Technical Notes

### Existing infrastructure to reuse
- **Data source:** `mart_incident_trends` table already stores daily counts per (date, domain, category)
- **Sparkline component:** `components/ui/sparkline.tsx` — accepts `ChartPoint[]`, renders Recharts AreaChart
- **Types:** `ChartPoint { date: string; value: number }`, `CategoryBreakdown { category, count, percent }`

### New API endpoint
- `GET /api/city-pulse/category-trends?timeWindow=7d&neighborhood=all`
- Returns: `Record<string, Record<string, ChartPoint[]>>` — keyed by domain, then by category
- Query: select from `mart_incident_trends` where date within time window, for categories present in current breakdown

### Frontend changes
- Extend `useCityPulseData` hook to fetch category trends alongside existing data
- Add `CategoryTooltip` component with sparkline embedded (non-interactive sparkline, height ~40px)
- Add hover state management to `CategoryChart` (mouse enter/leave on bar rows)
- Tooltip positioning via CSS absolute/fixed positioning

### Data flow
```
mart_incident_trends (DB)
  → /api/city-pulse/category-trends (API)
    → useCityPulseData hook (preloaded)
      → CategoryChart receives trends as prop
        → hover bar → show CategoryTooltip with sparkline
```

## Implementation Phases

### Phase 1: Category Sparkline Tooltips (single phase)
All requirements (FR-1 through FR-6) implemented together:
1. API endpoint + DB query for per-category daily trends
2. Frontend data fetching (preloaded in hook)
3. Custom tooltip component with embedded sparkline
4. Tooltip positioning and transitions
5. Tests
