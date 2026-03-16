# Design Brief: Denver Urban Pulse

## UI Framework
- Library: shadcn/ui
- CSS: Tailwind CSS (utility-first)
- Charts: Recharts
- Map: Leaflet + React Leaflet

## Theme
- Mode: Light only
- Style: Clean BI — professional, data-first, calm but not empty

## Color Palette

| Role | Color | Usage |
|------|-------|-------|
| Text primary | `#102A43` | Headings, KPI numbers |
| Text secondary | `#52667A` | Labels, descriptions |
| Text muted | `#627D98` | Footnotes, secondary info |
| Background | `#FFFFFF` | Cards, main area |
| Page background | `#F4F6F8` | App background |
| Background subtle | `#EEF3F8` | Map area, secondary fills |
| Border | `#DDE3EA` | Card borders |
| Accent blue | `#0B4F8C` | Active nav, links |
| Accent blue light | `#E9F2FF` | Active nav background |
| Dark panel | `#163A5D` | Narrative block background |
| Crime sparkline | `#2458C6` | Crime data series |
| Crash sparkline | `#D97904` | Traffic crash data series |
| 311 sparkline | `#198754` | 311 requests data series |
| Positive delta | `#198754` (green) | Up indicators (positive) |
| Negative delta | `#DC3545` (red) | Down indicators (negative) |
| Warning bg | `#FFF9F0` | Anomaly cards background |
| Warning border | `#F1D9B6` | Anomaly cards border |
| Warning text | `#7C3E00` | Anomaly card titles |

## Typography
- Font family: **IBM Plex Sans**
- Headings: 700 weight, `#102A43`
- Body/labels: 400–500 weight, `#52667A` / `#627D98`
- Numbers/KPIs: 700 weight, large size (34px), `#102A43`
- Small labels: 10–11px, `#627D98`

## Layout
- Navigation: Top header bar (no sidebar) — dashboard title left, filters + freshness info right
- Header height: ~56px, white background, bottom border `#E6E9EE`
- Main content area: full viewport width, `#F4F6F8` background, padding 16–20px
- Card corner radius: 14px
- Card shadow: `0 2px 6px #102A4310`
- Card border: 1px `#DDE3EA`
- Card padding: 14px
- Content gap: 16px (between major sections), 10–12px (between cards in a row)
- Max content width: none (fluid within main area)
- Page grid (single page, no tabs):
  - Row 1: KPI Strip — 4 cards (Crime, Crashes, 311, AQI)
  - Row 2: Neighborhood Map (60%) + Category Breakdown (40%)
  - Row 3: AQI Trend (50%) + Time Heatmap (50%)
  - Row 4: Change Leaders (full-width)

## Design Reference
- Pencil mockup: `docs/design/denver-urban-pulse-design.pen`
- The mockup defines the City Pulse screen layout and visual language
- Environment & Neighborhoods screen should follow the same design system

## Component Standards

### KPI Cards
- White background, 14px corner radius, subtle shadow
- Header row: metric label (11px, 700, `#52667A`) + secondary tag right-aligned
- Large number: 34px, 700, `#102A43`
- Delta row: pill badge (colored bg) + context label + sparkline (80px wide, 28px tall)
- Footer: one-line contextual insight (10px, `#627D98`)

### Chart Cards
- White background, 14px corner radius, border
- Title: 12px, 700, `#102A43`
- Chart area with subtle background (`#F8FAFC`)
- Footer insight text: 10px, `#6B7B8D`

### Map Card
- Full-width within its column (720px in hero row)
- Map background: `#EEF3F8`
- Choropleth bubbles with domain colors (crime blue, crash orange, 311 green)
- Floating legend and controls with glass-like background (`#FFFFFFE8`)

### Top Header
- White background, bottom border `#E6E9EE`
- Left: Dashboard title ("Denver Urban Pulse"), 16px, 700, `#102A43`
- Right: Time window filter + Neighborhood filter + Freshness info
- Freshness info: muted text (11px, `#627D98`), shows pipeline run time and data-complete-through date
- Sticky on scroll

### Filters
- Date chip: dark (`#102A43` bg, white text), pill shape
- Filter chip: light (`#EEF4FA` bg, `#C7D5E6` border), pill shape

## Responsive Breakpoints
- Desktop: ≥1280px — full multi-column layout, header with inline filters
- Tablet: 768–1279px — 2-column content, filters may wrap in header
- Mobile: <768px — single-column stack, filters stack below title

## Design Guardrails
- NO IoT/device dashboard aesthetics
- NO futuristic/cyberpunk styling
- NO generic SaaS revenue dashboard patterns
- NO visual clutter for the sake of "richness"
- Every element must earn its space
- Data readability over decoration
