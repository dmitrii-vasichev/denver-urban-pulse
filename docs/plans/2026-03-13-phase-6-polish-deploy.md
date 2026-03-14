# Phase 6 — Polish & Deploy

**Date:** 2026-03-13
**Phase:** 6 of 6
**PRD ref:** Section 21, Phase 6 (items 24–28)

## Overview

Final phase: polish the UI for all breakpoints, handle data edge cases gracefully, optimize performance, and harden production deployment. The goal is to make Denver Urban Pulse feel like a finished, professional BI product — not a prototype.

## Current State Assessment

| Area | Status | Gap |
|------|--------|-----|
| Desktop layout | ✅ Done | — |
| Mobile layout | ✅ Basic | Padding/spacing refinements needed |
| Tablet layout | ⚠️ Partial | No collapsed sidebar (design brief requires it) |
| Loading states | ✅ Done | Skeleton for all components |
| Error states | ✅ Basic | Minimal — no retry or recovery actions |
| Empty states | ❌ Missing | Charts/cards don't handle empty data arrays |
| next.config.ts | ❌ Empty | No optimizations configured |
| Vercel config | ❌ Missing | No vercel.json |
| Performance | ❓ Unknown | No measurement yet |
| Tests | ✅ Good | ~85% coverage of components |

## Tasks

### Task 1: Empty states for charts and data components — #78

**Description:** Add graceful empty state handling to all chart components and pages when API returns empty arrays or null values.

**Files:**
- `components/charts/incident-trend-chart.tsx` (modify)
- `components/charts/category-breakdown-chart.tsx` (modify)
- `components/charts/heatmap-chart.tsx` (modify)
- `components/charts/risk-corridors-chart.tsx` (modify)
- `components/charts/aqi-trend-chart.tsx` (modify)
- `components/charts/neighborhood-comparison-chart.tsx` (modify)
- `components/charts/change-leaders-chart.tsx` (modify)
- `components/charts/neighborhood-ranking-chart.tsx` (modify)

**Details:**
- Each chart: check if `data` is empty or undefined → show centered message inside ChartCard
- Message style: text-sm text-[#627D98], centered vertically and horizontally
- Messages per chart type:
  - Trend: "No incident data for the selected period"
  - Category: "No category data available"
  - Heatmap: "No activity data for the selected period"
  - Risk Corridors: "No neighborhood data available"
  - AQI Trend: "No AQI data available" (may already exist)
  - Comparison: "No comparison data available" (may already exist)
  - Change Leaders: "No change data available" (may already exist)
  - Rankings: "No ranking data available"
- KPI cards: when value is null/undefined, show "—" instead of 0

**Acceptance Criteria:**
- [ ] All 8 chart components handle empty/null data without crashing
- [ ] Empty state shows a descriptive message
- [ ] KPI cards display "—" for missing values
- [ ] Tests pass
- [ ] No lint errors

**Verification:** Pass empty arrays to each chart in tests, verify no crash and message renders.

---

### Task 2: Tablet responsive layout (768–1279px) — #79

**Description:** Add a collapsed sidebar mode for tablet breakpoints per design brief requirements. Currently the sidebar is hidden below xl (1280px) and replaced by a mobile drawer. Tablet should show a narrow icon-only sidebar.

**Files:**
- `components/layout/sidebar.tsx` (modify)
- `components/layout/page-shell.tsx` (modify)
- `app/globals.css` (modify if needed)

**Details:**
- At `lg` breakpoint (1024–1279px): show a narrow sidebar (w-16, 64px) with only icons, no labels
  - Each nav item shows only its Lucide icon, centered
  - Active item has the same blue highlight
  - Tooltip on hover showing the label text
- At `xl` breakpoint (≥1280px): keep full 240px sidebar as-is
- Below `lg`: keep current mobile drawer behavior
- Update PageShell to account for the collapsed sidebar width at `lg`
- Sidebar component logic: use a `collapsed` prop or responsive classes

**Acceptance Criteria:**
- [ ] lg breakpoint (1024–1279px) shows icon-only sidebar
- [ ] Icons are centered and have hover tooltips
- [ ] Active state is visually clear
- [ ] xl breakpoint still shows full sidebar
- [ ] Mobile drawer unchanged
- [ ] Content area adjusts to sidebar width at each breakpoint
- [ ] Tests pass
- [ ] No lint errors

**Verification:** Resize browser window through breakpoints, verify sidebar transitions.

---

### Task 3: Mobile spacing and filter refinements — #80

**Description:** Refine mobile layout spacing, filter controls, and typography for screens under 768px.

**Files:**
- `components/layout/header.tsx` (modify)
- `app/page.tsx` (modify)
- `app/environment/page.tsx` (modify)
- `components/cards/kpi-card.tsx` (modify if needed)

**Details:**
- Header: stack title and filters vertically on mobile (flex-col on small screens)
- Filters: full-width on mobile, side-by-side on tablet+
- KPI cards: ensure sparkline is visible and not clipped on narrow screens
- Hero row: map should be full-width on mobile with slightly reduced height (h-64 instead of h-96)
- Lower analytics grid: single column with full-width charts
- Reduce page padding on mobile: px-3 on mobile, px-4 on tablet, px-5 on desktop
- Ensure chart titles don't overflow on narrow screens

**Acceptance Criteria:**
- [ ] Header stacks vertically on mobile
- [ ] Filters are full-width and usable on mobile
- [ ] KPI sparklines visible on narrow screens
- [ ] Map height adjusts for mobile
- [ ] No horizontal overflow on any screen size
- [ ] Tests pass

**Verification:** Chrome DevTools responsive mode at 375px, 768px, 1024px, 1280px.

---

### Task 4: Error state improvements — #81

**Description:** Enhance error states with retry functionality and more descriptive messages.

**Files:**
- `app/page.tsx` (modify)
- `app/environment/page.tsx` (modify)
- `lib/hooks/use-city-pulse-data.ts` (modify)
- `lib/hooks/use-environment-data.ts` (modify)

**Details:**
- Add a `retry` function returned from each data hook
- Error card: show icon (AlertTriangle from lucide-react), error message, and "Try Again" button
- "Try Again" button calls the retry function to re-fetch data
- Style: border-l-4 with red accent, icon + message + button layout
- If error persists after retry, show "Data may be temporarily unavailable. Please try again later."

**Acceptance Criteria:**
- [ ] Both hooks expose a `retry()` function
- [ ] Error state shows descriptive message with retry button
- [ ] Clicking retry re-fetches data
- [ ] Styled consistently on both pages
- [ ] Tests pass

**Verification:** Simulate API failure (e.g., disconnect network), verify error UI and retry behavior.

---

### Task 5: Next.js configuration and performance optimization — #82

**Description:** Configure next.config.ts for production and optimize bundle/assets.

**Files:**
- `next.config.ts` (modify)
- `app/layout.tsx` (modify if needed)

**Details:**
- Add to next.config.ts:
  - `reactStrictMode: true`
  - `images: { formats: ['image/avif', 'image/webp'] }` (if images are used)
  - `poweredByHeader: false` (remove X-Powered-By header)
  - `compress: true`
- Verify dynamic imports for Leaflet map (`next/dynamic` with `ssr: false`) — should already be done
- Check that Recharts isn't imported in server components
- Verify font loading optimization (IBM Plex Sans via next/font or Google Fonts link)
- Add `<meta>` tags for SEO: title, description, og:image (basic)

**Acceptance Criteria:**
- [ ] next.config.ts has production optimizations
- [ ] No X-Powered-By header in response
- [ ] SEO meta tags present (title, description)
- [ ] `npm run build` succeeds without warnings
- [ ] Bundle size is reasonable (check build output)
- [ ] Tests pass

**Verification:** `npm run build` — check output for warnings and bundle sizes.

---

### Task 6: Production deployment configuration — #83

**Description:** Add Vercel deployment configuration and verify Railway pipeline is production-ready.

**Files:**
- `vercel.json` (new)
- `data/pipeline/railway.json` (verify)

**Details:**
- Create `vercel.json`:
  - Framework: Next.js (auto-detected, but explicit is safer)
  - Region: US East (iad1) or auto
  - Build command: `npm run build`
  - Environment variables reference: `DATABASE_URL`, `AIRNOW_API_KEY`
  - Headers: cache-control for static assets, security headers (X-Frame-Options, X-Content-Type-Options)
  - Rewrites if needed
- Verify Railway pipeline:
  - `railway.json` has correct cron schedule
  - Dockerfile builds successfully
  - Pipeline handles failures gracefully (already tested in Phase 2)
- Add `.env.example` file listing required environment variables (without values)

**Acceptance Criteria:**
- [ ] `vercel.json` with security headers and cache config
- [ ] `.env.example` documents all required env vars
- [ ] Railway config verified
- [ ] `npm run build` succeeds
- [ ] Tests pass

**Verification:** `npm run build` succeeds. Deployment smoke test after Vercel deploy.

---

### Task 7: Final QA — build, lint, tests, visual check — #84

**Description:** Run comprehensive QA: all tests, lint, build, and visual inspection of both pages with live data.

**Files:**
- Various (fix any issues found)

**Details:**
- Run full test suite: `npm test`
- Run linter: `npm run lint`
- Run production build: `npm run build`
- Visual QA checklist:
  - [ ] City Pulse loads with real data
  - [ ] Environment page loads with real data
  - [ ] Time window filter works on both pages
  - [ ] Neighborhood filter works on both pages
  - [ ] Map renders with choropleth on both pages
  - [ ] All charts render correctly
  - [ ] Narrative blocks show generated text
  - [ ] KPI cards show values, deltas, sparklines
  - [ ] "Last updated" shows correct date
  - [ ] Navigation between pages works
  - [ ] Mobile layout is functional (375px)
  - [ ] Tablet layout shows collapsed sidebar (1024px)
  - [ ] Desktop layout is correct (1280px+)
  - [ ] No console errors
  - [ ] No horizontal overflow at any breakpoint
- Fix any issues found during QA

**Acceptance Criteria:**
- [ ] `npm run lint` — 0 errors
- [ ] `npm run build` — 0 errors, no warnings
- [ ] `npm test` — all tests pass
- [ ] Visual QA checklist fully green
- [ ] No console errors in browser

**Verification:** All commands pass. Visual inspection confirms polish.

---

## Task Dependencies

```
Task 1 (empty states) ──────────┐
Task 2 (tablet sidebar) ────────┤
Task 3 (mobile spacing) ────────┼── Task 7 (final QA)
Task 4 (error improvements) ────┤
Task 5 (next.config) ───────────┤
Task 6 (deployment config) ─────┘
```

Tasks 1–6 are largely independent and can be built in any order.
Task 7 runs last as a comprehensive check.

## Execution Order (sequential)

1. Task 1 — Empty states for charts
2. Task 2 — Tablet collapsed sidebar
3. Task 3 — Mobile spacing refinements
4. Task 4 — Error state improvements
5. Task 5 — Next.js config & performance
6. Task 6 — Deployment configuration
7. Task 7 — Final QA

## Estimated scope

- 8+ chart components modified (empty states)
- 2 layout components modified (sidebar, header)
- 2 pages refined (responsive)
- 2 hooks enhanced (retry)
- 2 config files (next.config.ts, vercel.json)
- 1 new file (.env.example)
- Total: 7 tasks
