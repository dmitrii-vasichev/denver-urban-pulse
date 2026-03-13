# Denver Urban Pulse

## Overview
Public BI dashboard built on live Denver open data (crime, traffic crashes, 311 requests, air quality). Refreshed daily. Two screens: City Pulse and Environment & Neighborhoods.

## Stack
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Charts: Recharts
- Map: Leaflet + React Leaflet
- Backend: PostgreSQL (Railway), Python ingestion scripts
- Deploy: Vercel (frontend), Railway (database + cron)

## Commands
To be defined after framework initialization.

## Rules
- Follow workflow: PRD → Design → Phases → Plan → Issues → Code → Review
- Never push to main directly — PRs only
- Every commit references an issue: `closes #N`
- Workflow state: `.workflow-state.json`
- All documentation in English
- Before any UI work, read docs/design-brief.md and follow its guidelines
- Design reference: `docs/design/denver-urban-pulse-design.pen`
