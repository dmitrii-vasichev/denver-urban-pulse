# PRD — Denver Urban Pulse

## 1. Document

| Field | Value |
|-------|-------|
| **Project** | Denver Urban Pulse |
| **Type** | Public BI dashboard / portfolio project |
| **Version** | v1.0 |
| **Status** | Approved |
| **Design reference** | `docs/design/denver-urban-pulse-design.pen` (Overview page) |
| **Language** | Documentation — Russian; product UI — English |

---

## 2. Overview

Denver Urban Pulse is a public analytical dashboard built on live Denver open data, refreshed daily, that presents the city's operational pulse across crime, traffic safety, civic services, air quality, and neighborhood dynamics.

The project serves as a portfolio piece demonstrating the full lifecycle of a BI product: automated data ingestion from multiple open APIs, structured data modeling (raw → staging → marts), server-side aggregation, and a polished, responsive frontend with interactive map and analytical charts.

The dashboard must feel like a real analytical product — not a template, not a static mockup. When a hiring manager opens it, they should see today's data, understand the information hierarchy at a glance, and recognize mature BI thinking behind every design decision.

---

## 3. Problem Statement

Most BI portfolio projects fall into one of two traps: they are either static historical analyses with no live data, or they are narrow single-metric dashboards that don't demonstrate product-level thinking. Neither shows the ability to build a complete, maintainable analytical system.

Denver Urban Pulse solves this by combining:
- multiple live open data sources refreshed daily;
- structured data pipelines with proper modeling layers;
- two distinct but coherent analytical screens;
- interactive geospatial visualization;
- template-based data-driven narratives;
- production deployment with automated refresh.

The result is a project that demonstrates data engineering discipline, BI design maturity, and frontend development capability in a single deliverable.

---

## 4. Goals

### 4.1 Product Goals

Build a public dashboard that:
- refreshes daily with real Denver open data;
- presents a coherent multi-domain view of the city;
- answers analytical questions: "what changed?", "where is pressure highest?", "which neighborhoods need attention?";
- looks and functions like a real analytical product.

### 4.2 Portfolio Goals

The project must demonstrate:
- ability to build end-to-end data pipelines (ingestion → storage → marts → frontend);
- strong information hierarchy and visual design;
- interactive geospatial storytelling;
- mobile-responsive, production-quality frontend;
- daily automated data refresh — proof of a living system.

### 4.3 MVP Goals

For the initial release:
- 2 screens: **City Pulse** and **Environment & Neighborhoods**;
- daily data refresh from 4+ open data sources;
- KPI cards with sparklines and delta indicators;
- interactive Denver map with zoom and tooltips;
- template-based narrative summary blocks;
- time window filter (7d / 30d / 90d) and neighborhood selector;
- responsive design (desktop + mobile);
- public deployment.

---

## 5. Non-Goals

The following are explicitly **out of scope** for MVP:

- Real-time / streaming data updates
- User authentication or admin panel
- Data export / download functionality
- Multi-parameter complex filtering (beyond time window + neighborhood)
- AI/LLM-generated narrative text
- Map drill-down (click-to-navigate-to-detail)
- Write-back actions or workflow triggers
- Full GIS with heavy geospatial processing
- More than 2 screens

---

## 6. Target Audience

### 6.1 Primary (portfolio reviewers)

- Hiring managers and BI leads evaluating analytical capability
- Technical recruiters assessing product maturity
- Potential clients or collaborators reviewing skill level

### 6.2 Simulated (dashboard users)

The dashboard is designed as if for:
- City operations analysts monitoring daily activity
- Public safety stakeholders tracking risk distribution
- Urban intelligence researchers comparing neighborhoods

This simulated audience shapes the information architecture and ensures the dashboard tells a real analytical story, not just displays charts.

---

## 7. Product Scope

### 7.1 Screen 1 — City Pulse

The primary overview screen. Combines crime, traffic crashes, and 311 service requests into a single city-level view. This is the "front page" — the first thing a visitor sees.

**Intent:** What's happening in Denver right now, and where is the pressure highest?

### 7.2 Screen 2 — Environment & Neighborhoods

An analytical deep-dive into air quality and neighborhood-level comparisons. Shows how neighborhoods differ across key metrics, which ones are changing, and where environmental conditions add pressure.

**Intent:** How do neighborhoods compare, and what environmental factors are in play?

### 7.3 Navigation

Sidebar navigation shows:
- **City Pulse** (active)
- **Environment & Neighborhoods** (active)
- Services (disabled — future)
- Daily Brief (disabled — future)

Future items appear as greyed-out placeholders to signal product roadmap without promising unbuilt features.

---

## 8. User Questions Each Screen Must Answer

### 8.1 City Pulse

- What happened in Denver over the selected time window?
- Are crime incidents, crashes, or 311 requests trending up or down?
- Which neighborhoods are under the most pressure?
- What is the main signal today? (narrative block)
- Where is activity concentrated geographically? (map)
- What are the temporal patterns — by hour, by day of week?
- Which incident categories dominate?

### 8.2 Environment & Neighborhoods

- What is the current air quality in Denver?
- How has AQI trended over the selected period?
- Which neighborhoods rank highest/lowest across key metrics?
- How do neighborhoods compare on crime, crashes, and 311 combined?
- Which neighborhoods changed the most vs. prior period?
- Is there a correlation between AQI and incident density?

---

## 9. Data Sources

### 9.1 Primary Sources (MVP)

| Domain | Source | Access Method | Update Frequency |
|--------|--------|---------------|-----------------|
| Crime | Denver Open Data — Crime dataset | ArcGIS REST API / CSV export | Mon–Fri |
| Traffic Crashes | Denver Open Data — Traffic Accidents | ArcGIS REST API / CSV export | Mon–Fri |
| 311 Requests | Denver Open Data — 311 Service Requests | ArcGIS REST API / CSV export | Daily |
| Air Quality (AQI) | EPA AirNow API | REST API (free key required) | Hourly (ingested daily) |
| Neighborhoods (geo) | Denver Open Data — Statistical Neighborhoods | GeoJSON / ArcGIS Feature Service | Static (updated rarely) |

**Denver Open Data Portal:** https://www.denvergov.org/opendata  
**ArcGIS Hub:** https://opendata-geospatialdenver.hub.arcgis.com  
**AirNow API:** https://docs.airnowapi.org

### 9.2 Data Characteristics

All Denver Open Data datasets:
- Cover the previous 5 calendar years plus current YTD.
- Are based on NIBRS (crime) and city reporting systems (crashes, 311).
- May receive retroactive updates (late-arriving records, corrections).
- Use Denver's statistical neighborhood boundaries as the geographic dimension.
- Contain lat/lon coordinates for most records (some records may lack geo data).

AirNow API:
- Provides current and historical AQI observations by monitoring station.
- Free API key required (rate-limited).
- Denver metro area has multiple monitoring stations.

### 9.3 Data Quality Considerations

The ingestion pipeline must account for:
- **Late-arriving data:** records may appear or change days after the event.
- **Incomplete geo data:** some records lack coordinates or neighborhood assignment.
- **Inconsistent naming:** neighborhood names may vary across datasets.
- **Rolling windows:** some endpoints may not serve full history.
- **Lag:** data may be 1–3 days behind real events.

**Mitigation:** Use snapshot-based ingestion (store raw daily snapshots), normalize neighborhood names via a reference mapping table, and show "Last refresh" prominently in the UI.

---

## 10. Data Architecture

### 10.1 Refresh Model

- **Frequency:** 1 automated refresh per day (scheduled cron job)
- **Type:** Batch ingestion, not real-time
- **UI indicator:** Every screen shows `Last updated: {date}` in the header

### 10.2 Data Layers

Three-layer architecture:

1. **Raw** — unmodified data as received from each source, with ingestion timestamp and source tag. Stored as daily snapshots for traceability.

2. **Staging** — cleaned and normalized entities. Consistent column names, unified neighborhood mapping, parsed timestamps, filtered out incomplete records.

3. **Marts** — pre-aggregated tables optimized for frontend queries. Each mart serves a specific UI component or screen section.

### 10.3 Core Marts

| Mart | Purpose | Serves |
|------|---------|--------|
| `mart_city_pulse_daily` | Daily aggregates across crime, crashes, 311 | KPI cards, trend charts |
| `mart_city_pulse_neighborhood` | Per-neighborhood totals and deltas | Map layer, neighborhood selector |
| `mart_incident_trends` | Time-series by domain and category | Trend line charts |
| `mart_category_breakdown` | Incident counts by type/category | Bar/pie charts |
| `mart_heatmap_hour_day` | Hour × day-of-week matrix | Heatmap chart |
| `mart_neighborhood_ranking` | Ranked neighborhoods by composite score | Ranking table/chart |
| `mart_aqi_daily` | Daily AQI observations for Denver | AQI trend, current indicator |
| `mart_neighborhood_comparison` | Multi-metric comparison across neighborhoods | Comparison charts |
| `mart_narrative_signals` | Top signals for template-based narrative | City Pulse Today block |

---

## 11. Narrative Blocks (Template-Based)

### 11.1 Approach

Each screen includes a narrative summary block that generates human-readable text from data, using template logic on the backend. This is **not AI-generated** — it uses deterministic templates with data interpolation.

### 11.2 Example Templates

**City Pulse Today:**
```
"Pressure is concentrating in {top_neighborhood}. 
{domain_with_largest_increase} up {delta_pct}% vs prior {time_window}, 
driven by {top_category}. {secondary_signal}."
```

**Environment Summary:**
```
"Air quality is {aqi_level} (AQI {aqi_value}). 
{top_neighborhood} leads in combined incident density, 
while {most_improved_neighborhood} shows the largest improvement 
over the past {time_window}."
```

### 11.3 Signal Selection Logic

The narrative mart (`mart_narrative_signals`) computes:
- Which domain (crime / crashes / 311) had the largest delta.
- Which neighborhood has the highest composite pressure.
- Which category is the top contributor.
- What the current AQI status is.

These are ranked and the top 2–3 signals populate the template.

---

## 12. Screen Specifications

### 12.1 City Pulse — Layout

**Header row:**
- Page title: "City Intelligence Overview"
- Subtitle: status indicators (source count, last update, data freshness)
- Filters: time window selector (Last 7 Days / 30 Days / 90 Days) + neighborhood dropdown

**KPI row (3 cards):**
- Crime Incidents — count, delta vs prior period, sparkline (7-day), contextual note
- Traffic Crashes — count, delta, sparkline, contextual note
- Open 311 Requests — count, delta, sparkline, contextual note

Each KPI card includes:
- Metric label + secondary tag (e.g., "7D", "Severity", "SLA")
- Large number
- Delta indicator (▲/▼ with percentage, color-coded green/red)
- Sparkline (last 7 or 30 data points)
- One-line contextual insight

**Hero row (2 columns):**

*Left column (~60% width) — Map card:*
- "Denver Neighborhood Activity Map"
- Interactive map (Leaflet/MapLibre) showing Denver neighborhoods
- Choropleth or bubble overlay based on incident density
- Color legend
- Toggle tabs: Density / Neighborhoods / AQI Overlay (optional)
- Zoom + tooltip on hover (neighborhood name, incident count, delta)

*Right column (~40% width):*
- **City Pulse Today** — dark-background narrative card with template-generated summary text, key stat badges (e.g., "Pain Points: 6", "AQI: High"), and optional "Expand" link
- **Mini insight cards (2):**
  - Anomaly Watch — neighborhoods with unusual spikes
  - Neighborhood Movement — top movers (up/down) vs prior period

**Lower analytics row (2×2 grid):**
- **Incident Trend** — multi-line time series (crime + crashes + 311 over 90 days)
- **Crime vs Property vs Events Mix** — stacked bar or donut showing category proportions
- **Hour × Day Heatmap** — matrix showing incident intensity by hour (rows) and day of week (columns)
- **Highest Risk Corridors** — horizontal bar chart ranking top neighborhoods by combined metric

### 12.2 Environment & Neighborhoods — Layout

**Header row:**
- Page title: "Environment & Neighborhoods"
- Same filter controls as City Pulse

**KPI row (3–4 cards):**
- Current AQI — value, status label (Good/Moderate/Unhealthy), color indicator, sparkline
- Neighborhood Count — total active neighborhoods in selected filter
- Most Pressured Neighborhood — name + composite score
- Most Improved Neighborhood — name + delta indicator

**Hero row (2 columns):**

*Left column — Neighborhood comparison map:*
- Denver map colored by composite neighborhood score
- Tooltip: neighborhood name, rank, key metrics breakdown

*Right column:*
- **Environment Summary** — narrative block (template-based) with AQI context and neighborhood highlights
- **AQI Trend** — line chart showing AQI over the selected time window with threshold bands (Good/Moderate/Unhealthy)

**Lower analytics row (2×2 grid):**
- **Neighborhood Ranking** — sortable horizontal bar chart of neighborhoods by composite score
- **Neighborhood Comparison Radar** — radar/spider chart comparing 2–3 selected neighborhoods across metrics (crime rate, crash rate, 311 density, AQI)
- **Metric Breakdown by Neighborhood** — grouped bar chart showing per-neighborhood breakdown by domain
- **Change Leaders** — table or lollipop chart showing neighborhoods with largest positive and negative changes

### 12.3 Shared Components

Both screens share:
- Sidebar navigation
- Header with filters
- "Last updated" indicator
- KPI card component (reusable, configurable)
- Chart card wrapper (title, subtitle, chart area, optional legend)
- Responsive breakpoints

---

## 13. Filters

### 13.1 Time Window

| Option | Value | Default |
|--------|-------|---------|
| Last 7 Days | 7d | |
| Last 30 Days | 30d | ✓ |
| Last 90 Days | 90d | |

Applied globally to the active screen. All charts, KPIs, map overlays, and narrative blocks respond to the selected window.

### 13.2 Neighborhood Selector

- Dropdown with "All Neighborhoods" as default
- Selecting a specific neighborhood filters all data to that neighborhood
- Map zooms/highlights the selected neighborhood
- KPI cards and charts recalculate for the selected area

**Implementation note:** If neighborhood filtering adds significant complexity to queries or requires additional marts, it can be deferred to a post-MVP iteration. The filter UI should still be present but can default to "All" only.

---

## 14. Visual Design

### 14.1 Design Reference

The Pencil mockup (`denver-urban-pulse-design.pen`) provides the directional visual language for the City Pulse screen. The Environment & Neighborhoods screen should follow the same design system but have its own distinct character.

### 14.2 Design Principles

- **Light, clean, professional** — white/light gray backgrounds, minimal borders, subtle shadows
- **BI-first** — data readability over decoration
- **Calm but not empty** — every element earns its space
- **Consistent hierarchy** — KPIs → hero row → lower analytics follows a clear scanning pattern
- **One product feel** — both screens share the same design system but are not visually identical

### 14.3 Typography

- Primary font: **IBM Plex Sans**
- Headings: 700 weight, `#102A43`
- Body/labels: 400–500 weight, `#52667A` / `#627D98`
- Numbers/KPIs: 700 weight, large size, `#102A43`

### 14.4 Color System

| Role | Color | Usage |
|------|-------|-------|
| Text primary | `#102A43` | Headings, KPI numbers |
| Text secondary | `#52667A` | Labels, descriptions |
| Text muted | `#627D98` | Footnotes, secondary info |
| Background | `#FFFFFF` | Cards, main area |
| Background subtle | `#EEF3F8` | Map area, secondary fills |
| Border | `#DDE3EA` | Card borders |
| Accent blue | `#0B4F8C` | Active nav, links |
| Accent blue light | `#E9F2FF` | Active nav background |
| Dark panel | `#163A5D` | Narrative block background |
| Positive delta | Green tone | Up indicators |
| Negative delta | Red tone | Down indicators |
| Warning | `#FFF9F0` bg / `#F1D9B6` border | Anomaly cards |

### 14.5 Design Guardrails

Do NOT:
- Use IoT / device dashboard aesthetics
- Use futuristic / cyberpunk styling
- Use generic SaaS revenue dashboard patterns
- Add visual clutter for the sake of "richness"
- Make Environment & Neighborhoods look like a copy of City Pulse with different data

---

## 15. Responsive Design

### 15.1 Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop | ≥1280px | Full layout as designed — sidebar + main content |
| Tablet | 768–1279px | Collapsed sidebar (hamburger), 2-column content |
| Mobile | <768px | No sidebar (bottom nav or hamburger), single-column stack |

### 15.2 Mobile Adaptations

- KPI cards stack vertically (1 per row)
- Hero row becomes single column (map full-width, then narrative below)
- Lower analytics: single column, each chart full-width
- Map: full-width, slightly reduced height
- Filters: collapsible filter bar or modal
- Sidebar: hamburger menu or bottom navigation

---

## 16. Technical Architecture

### 16.1 Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js** (App Router) | React framework with SSR/SSG, file-based routing |
| **TypeScript** | Type safety across the codebase |
| **Tailwind CSS** | Utility-first styling, responsive design |
| **shadcn/ui** | Lightweight, customizable UI components |
| **Recharts** | Chart library — well-integrated with React, easy to customize, good for sparklines and standard chart types |
| **Leaflet** + **React Leaflet** | Interactive map — lightweight, well-documented, large ecosystem, good for choropleth and tooltips |

**Why Recharts:** Simpler API than D3, native React components, built-in responsiveness, handles sparklines well. Good fit for someone working with Claude Code who needs reliable, well-documented components.

**Why Leaflet:** Battle-tested for web maps, lightweight, works well with GeoJSON neighborhood boundaries, and has straightforward tooltip/popup API. MapLibre is an alternative if vector tiles are needed later.

### 16.2 Backend / Data

| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Analytical storage — raw tables, staging, marts |
| **Python** | Ingestion scripts, data transformation, mart generation |
| **Cron (Railway)** | Scheduled daily refresh |
| **Next.js API Routes** | Lightweight API layer serving mart data to frontend |

### 16.3 Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | **Vercel** | Auto-deploy from GitHub, edge CDN |
| Database | **Railway** | Managed PostgreSQL |
| Cron Jobs | **Railway** | Scheduled Python scripts for daily refresh |

### 16.4 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                          │
│  Denver Open Data (ArcGIS)  ·  EPA AirNow API           │
└──────────────────────┬──────────────────────────────────┘
                       │ Daily cron (Railway)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              PYTHON INGESTION SCRIPTS                    │
│  Fetch → Validate → Store raw snapshots                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              POSTGRESQL (Railway)                        │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────┐  │
│  │   Raw   │→ │ Staging  │→ │        Marts           │  │
│  │ tables  │  │ (clean)  │  │ (pre-aggregated views) │  │
│  └─────────┘  └──────────┘  └────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│           NEXT.JS APP (Vercel)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ API Routes   │  │ City Pulse   │  │ Env & Neigh  │  │
│  │ (read marts) │  │   Screen     │  │   Screen     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 16.5 Technical Principles

- **Simple over clever** — maintainable code beats over-engineered solutions
- **Server-side aggregation** — heavy computation happens in SQL marts, not in the browser
- **One system** — single chart library, single map library, single component system
- **Daily reliability** — the refresh pipeline must not silently fail
- **Snapshot-friendly** — raw data is stored with timestamps for traceability

---

## 17. User Scenarios

### Scenario A — Daily Scan

A user opens City Pulse, sees "Last updated: today", scans KPI cards for directional changes, reads the narrative block for the main signal, glances at the map for geographic concentration, then checks the trend chart for trajectory.

### Scenario B — Neighborhood Investigation

From City Pulse, the user navigates to Environment & Neighborhoods, selects a specific neighborhood from the dropdown, and sees how it ranks across metrics, its AQI context, and how it compares to the city average.

### Scenario C — Portfolio Review

A hiring manager opens the link, immediately sees fresh data (today's date in "Last updated"), recognizes this is a live product. They scan the City Pulse screen for design quality and analytical depth, switch to Environment & Neighborhoods to see a second coherent screen, and conclude this is a production-grade BI project — not a mockup.

---

## 18. Non-Functional Requirements

### 18.1 UX

- Clear information hierarchy — scannable in 5 seconds
- Readable labels, tooltips, and legends
- Consistent component system across both screens
- Smooth loading states (skeleton screens or shimmer, not blank white)
- No broken states when data is partial or delayed

### 18.2 Performance

- Initial page load: < 3 seconds on desktop
- All heavy aggregation in SQL marts — no client-side aggregation of raw data
- Charts render from pre-computed mart data
- Map loads GeoJSON once, overlays from mart data

### 18.3 Reliability

- Daily refresh must not silently fail
- If refresh fails, UI shows last successful refresh date (stale state)
- Ingestion pipeline logs success/failure for each source
- Partial failures (e.g., AQI API down) should not break other data

### 18.4 Maintainability

- Clear folder structure (pages, components, lib, api, data)
- Shared UI primitives (KPI card, chart card, filter components)
- Centralized data access (all API routes in one place)
- Reusable chart patterns (same wrapper for all chart types)
- Minimal duplication between screens

---

## 19. Data-State Handling

The UI must handle these states gracefully:

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton/shimmer placeholders for each component |
| **Complete data** | Full render as designed |
| **Partial data** | Show available data, indicate missing sources |
| **Stale data** | Show last refresh date with "Data may be outdated" indicator |
| **Empty state** | Friendly message: "No data available for selected filters" |
| **API failure** | Retry logic in ingestion; frontend shows last known good state |

---

## 20. Acceptance Criteria

The MVP is complete when:

1. ☐ **City Pulse** screen is implemented with real daily data
2. ☐ **Environment & Neighborhoods** screen is implemented with real daily data
3. ☐ Both screens use the same design system but feel distinct
4. ☐ KPI cards show live counts, deltas, and sparklines
5. ☐ Interactive Denver map renders with zoom and tooltips
6. ☐ Template-based narrative blocks generate text from data
7. ☐ Time window filter (7d / 30d / 90d) works across all components
8. ☐ "Last updated" reflects actual refresh date
9. ☐ Data refreshes automatically every day
10. ☐ At least 4 analytical chart modules per screen
11. ☐ Desktop and mobile layouts are functional
12. ☐ Frontend is deployed publicly on Vercel
13. ☐ Database and cron jobs run on Railway
14. ☐ No hardcoded data — everything comes from the database

---

## 21. Implementation Order

### Phase 1 — Foundation
1. Initialize repository (Next.js + TypeScript + Tailwind + shadcn/ui)
2. Set up PostgreSQL on Railway
3. Validate all data source APIs — confirm endpoints, fields, access
4. Build ingestion scripts for each source (Python)
5. Design and create database schema (raw → staging → marts)

### Phase 2 — Data Pipeline
6. Implement raw ingestion for all 4+ sources
7. Build staging transformations (cleaning, normalization, neighborhood mapping)
8. Build mart layer (all 9 marts listed in section 10.3)
9. Set up cron job for daily refresh
10. Verify end-to-end pipeline with real data

### Phase 3 — Frontend Shell
11. Build app shell: sidebar navigation, header, filter controls
12. Implement shared components: KPI card, chart card wrapper, loading states
13. Set up Next.js API routes reading from marts
14. Implement responsive layout structure

### Phase 4 — City Pulse Screen
15. KPI cards with sparklines
16. Interactive map (Leaflet + GeoJSON + choropleth)
17. Narrative block (City Pulse Today)
18. Lower analytics: trend, category breakdown, heatmap, ranking

### Phase 5 — Environment & Neighborhoods Screen
19. AQI KPI card + trend chart
20. Neighborhood ranking chart
21. Neighborhood comparison (radar or grouped bar)
22. Narrative block (Environment Summary)
23. Map with neighborhood composite score overlay

### Phase 6 — Polish & Deploy
24. Mobile responsive adaptations
25. Loading states, empty states, error states
26. Performance optimization (if needed)
27. Final QA with real data
28. Production deployment hardening

### Build Philosophy

The priority order is:
1. **Data correctness** — marts produce accurate numbers
2. **Layout fidelity** — screens match the design direction
3. **Chart polish** — tooltips, animations, edge cases
4. **Secondary enhancements** — mobile refinements, transitions

---

## 22. Risks

### Data Risks
- **Unstable endpoints** — Denver Open Data may change API structure. Mitigation: store raw snapshots, abstract API calls into isolated modules.
- **Late-arriving records** — data may be 1–3 days behind. Mitigation: show "Data through {date}" in UI.
- **Inconsistent neighborhoods** — different datasets may use different naming. Mitigation: build a canonical neighborhood mapping table.
- **AirNow rate limits** — free API tier may be limited. Mitigation: cache daily, don't over-query.

### Product Risks
- **City Pulse becomes too generic** — must have clear narrative and hierarchy, not just charts. Mitigation: narrative block and information architecture keep it focused.
- **Environment screen feels disconnected** — must share design language with City Pulse. Mitigation: same component system, shared color palette, consistent layout patterns.
- **Dashboard looks like a template** — must avoid generic BI dashboard aesthetics. Mitigation: follow the Pencil mockup's visual direction, use Denver-specific content.

### Delivery Risks
- **Map complexity** — interactive maps can consume disproportionate development time. Mitigation: start with basic choropleth + tooltip, enhance later.
- **Premature polishing** — temptation to perfect charts before data pipeline works. Mitigation: follow the implementation order strictly.
- **Scope creep** — adding screens or features before MVP is solid. Mitigation: this PRD defines the boundary.

---

## 23. Open Questions

1. **Denver neighborhood GeoJSON** — which exact layer to use for boundary polygons? Statistical Neighborhoods is the likely candidate, but needs validation.
2. **311 dataset year partitioning** — Denver splits 311 data by year (e.g., "311 Service Requests 2024"). Need to confirm how to access current year and whether a union across years is needed.
3. **AirNow API key** — needs to be obtained and stored as environment variable.
4. **Neighborhood filter complexity** — if filtering by neighborhood requires separate mart queries or adds significant backend complexity, it may be simplified to "All Neighborhoods" only for initial release.
5. **Chart library confirmation** — Recharts is recommended, but if specific chart types (heatmap, radar) prove difficult, alternatives like Nivo or a custom D3 component may be needed for individual charts.

---

## 24. Project Structure (Recommended)

```
denver-urban-pulse/
├── docs/
│   ├── prd-denver-urban-pulse.md
│   └── design/
│       └── denver-urban-pulse-design.pen
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # City Pulse (default)
│   ├── environment/
│   │   └── page.tsx              # Environment & Neighborhoods
│   └── api/
│       ├── city-pulse/
│       ├── environment/
│       └── shared/
├── components/
│   ├── layout/                   # Sidebar, Header, Filters
│   ├── cards/                    # KPI Card, Chart Card
│   ├── charts/                   # Trend, Heatmap, Ranking, etc.
│   ├── map/                      # Denver Map component
│   └── narrative/                # Narrative block
├── lib/
│   ├── db.ts                     # Database connection
│   ├── queries/                  # SQL query functions per mart
│   └── utils/                    # Formatters, helpers
├── data/
│   ├── ingestion/                # Python scripts
│   ├── staging/                  # Transformation scripts
│   ├── marts/                    # Mart generation scripts
│   └── geo/                      # GeoJSON files
├── public/
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 25. Definition of Done

The project is considered complete for MVP when:

- Two coherent screens display real, daily-refreshed data
- Data pipeline runs automatically without manual intervention
- The application is publicly accessible via a Vercel URL
- Design follows the visual direction established in the Pencil mockup
- Both screens have interactive charts, map, and narrative elements
- Mobile layout is functional (not necessarily pixel-perfect, but usable)
- The project can be confidently presented as a finished BI portfolio case
