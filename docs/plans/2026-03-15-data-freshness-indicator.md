# Data Freshness Indicator — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Trim time-series data to the last date where all domains have complete data, and show pipeline/freshness status in the header.

**Architecture:** Each API route computes `effectiveThrough` (MIN of MAX dates across domains) via a single SQL query, filters series data by that boundary, and returns both `lastUpdated` and `effectiveThrough` in the response. Data hooks extract these values and pass them to the Header component for display.

**Tech Stack:** Next.js API routes (TypeScript), PostgreSQL queries, React hooks, Tailwind CSS

---

### Task 1: Add `getEffectiveThrough` query for City Pulse

**Files:**
- Modify: `lib/queries/city-pulse.ts`
- Test: `__tests__/api-city-pulse.test.ts`

**Step 1: Write the failing test**

In `__tests__/api-city-pulse.test.ts`, add a new test inside the `"GET /api/city-pulse/trends"` describe block:

```typescript
it("returns effectiveThrough as the min of max dates across domains", async () => {
  // getTrends query
  mockQuery.mockResolvedValueOnce([
    { date: "2026-03-08", domain: "crime", count: 10 },
    { date: "2026-03-08", domain: "crashes", count: 5 },
    { date: "2026-03-08", domain: "311", count: 20 },
    { date: "2026-03-09", domain: "crime", count: 12 },
    { date: "2026-03-09", domain: "crashes", count: 6 },
    { date: "2026-03-09", domain: "311", count: 22 },
    { date: "2026-03-10", domain: "311", count: 25 },
  ]);
  // getEffectiveThrough query
  mockQuery.mockResolvedValueOnce([
    { effective_through: "2026-03-09" },
  ]);

  const res = await getTrends(makeRequest("http://localhost/api/city-pulse/trends?timeWindow=30d"));
  const body = await res.json();

  expect(body.effectiveThrough).toBe("2026-03-09");
  // Series should be trimmed — no Mar 10
  expect(body.data.series.every((p: { date: string }) => p.date <= "2026-03-09")).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=api-city-pulse --verbose 2>&1 | tail -20`
Expected: FAIL — `body.effectiveThrough` is undefined

**Step 3: Add `getEffectiveThrough` function to `lib/queries/city-pulse.ts`**

Add at the end of the file (before the closing):

```typescript
export async function getEffectiveThrough(tw: TimeWindow): Promise<string | null> {
  const days = daysForWindow(tw);
  const rows = await query<{ effective_through: string }>(
    `SELECT MIN(max_date)::text AS effective_through
     FROM (
       SELECT domain, MAX(date) AS max_date
       FROM mart_incident_trends
       WHERE date >= (NOW() AT TIME ZONE 'America/Denver')::date - $1::int
       GROUP BY domain
     ) sub`,
    [days]
  );
  return rows[0]?.effective_through ?? null;
}
```

**Step 4: Update trends API route to use `getEffectiveThrough`**

Modify `app/api/city-pulse/trends/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTrends, getEffectiveThrough } from "@/lib/queries/city-pulse";
import type { TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tw = (request.nextUrl.searchParams.get("timeWindow") ?? "30d") as TimeWindow;
    const [rows, effectiveThrough] = await Promise.all([
      getTrends(tw),
      getEffectiveThrough(tw),
    ]);

    // Pivot: group by date, spread domains into columns
    const byDate = new Map<string, { crime: number; crashes: number; requests311: number }>();
    for (const r of rows) {
      if (!byDate.has(r.date)) {
        byDate.set(r.date, { crime: 0, crashes: 0, requests311: 0 });
      }
      const entry = byDate.get(r.date)!;
      if (r.domain === "crime") entry.crime = r.count;
      else if (r.domain === "crashes") entry.crashes = r.count;
      else if (r.domain === "311") entry.requests311 = r.count;
    }

    const series = Array.from(byDate.entries())
      .map(([date, vals]) => ({ date, ...vals }))
      .filter((p) => !effectiveThrough || p.date <= effectiveThrough)
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      data: { series },
      lastUpdated: new Date().toISOString(),
      effectiveThrough,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- --testPathPattern=api-city-pulse --verbose 2>&1 | tail -20`
Expected: PASS

**Step 6: Fix existing trends test (now expects extra `mockQuery` call)**

The existing test `"returns pivoted trend series"` needs a second mock for `getEffectiveThrough`. Update it:

```typescript
it("returns pivoted trend series", async () => {
  mockQuery.mockResolvedValueOnce([
    { date: "2026-03-11", domain: "crime", count: 10 },
    { date: "2026-03-11", domain: "crashes", count: 5 },
    { date: "2026-03-11", domain: "311", count: 20 },
    { date: "2026-03-12", domain: "crime", count: 12 },
  ]);
  // getEffectiveThrough
  mockQuery.mockResolvedValueOnce([
    { effective_through: "2026-03-12" },
  ]);

  const res = await getTrends(makeRequest("http://localhost/api/city-pulse/trends"));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.data.series).toHaveLength(2);
  expect(body.data.series[0]).toEqual({
    date: "2026-03-11",
    crime: 10,
    crashes: 5,
    requests311: 20,
  });
  expect(body.effectiveThrough).toBe("2026-03-12");
});
```

**Step 7: Run all tests and commit**

Run: `npm test -- --testPathPattern=api-city-pulse --verbose`
Expected: All PASS

```bash
git add lib/queries/city-pulse.ts app/api/city-pulse/trends/route.ts __tests__/api-city-pulse.test.ts
git commit -m "feat: add effectiveThrough to city pulse trends API (closes #TBD)"
```

---

### Task 2: Add `effectiveThrough` to City Pulse KPIs API

**Files:**
- Modify: `app/api/city-pulse/kpis/route.ts`
- Test: `__tests__/api-city-pulse.test.ts`

**Step 1: Write the failing test**

Add to the `"GET /api/city-pulse/kpis"` describe block:

```typescript
it("returns effectiveThrough in response", async () => {
  // sparkline query
  mockQuery.mockResolvedValueOnce([
    { date: "2026-03-09", crime_count: 10, crash_count: 5, requests_311_count: 20 },
  ]);
  // totals query
  mockQuery.mockResolvedValueOnce([
    {
      crime_count: 300, crash_count: 100, requests_311_count: 500,
      crime_delta_pct: 5.2, crash_delta_pct: -3.1, requests_311_delta_pct: 12.0,
    },
  ]);
  // getEffectiveThrough query
  mockQuery.mockResolvedValueOnce([
    { effective_through: "2026-03-09" },
  ]);

  const res = await getKpis(makeRequest("http://localhost/api/city-pulse/kpis?timeWindow=30d"));
  const body = await res.json();

  expect(body.effectiveThrough).toBe("2026-03-09");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=api-city-pulse -t "returns effectiveThrough in response" --verbose`
Expected: FAIL

**Step 3: Update KPIs route**

Modify `app/api/city-pulse/kpis/route.ts` to import and call `getEffectiveThrough`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getKpiSparkline, getKpiTotals, getEffectiveThrough } from "@/lib/queries/city-pulse";
import type { TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_WINDOWS: TimeWindow[] = ["7d", "30d", "90d"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tw = (searchParams.get("timeWindow") ?? "30d") as TimeWindow;
    const neighborhood = searchParams.get("neighborhood") ?? "all";

    if (!VALID_WINDOWS.includes(tw)) {
      return NextResponse.json(
        { error: "Invalid timeWindow. Use 7d, 30d, or 90d." },
        { status: 400 }
      );
    }

    const [sparkline, totals, effectiveThrough] = await Promise.all([
      getKpiSparkline(tw, neighborhood),
      getKpiTotals(tw, neighborhood),
      getEffectiveThrough(tw),
    ]);

    const toKpi = (
      countKey: "crime_count" | "crash_count" | "requests_311_count",
      deltaKey: "crime_delta_pct" | "crash_delta_pct" | "requests_311_delta_pct"
    ) => ({
      value: totals?.[countKey] ?? 0,
      delta: 0,
      deltaPercent: totals?.[deltaKey] ?? null,
      sparkline: sparkline
        .map((r) => ({ date: r.date, value: r[countKey] }))
        .reverse(),
      insight: "",
      tag: tw,
    });

    return NextResponse.json({
      data: {
        crime: toKpi("crime_count", "crime_delta_pct"),
        crashes: toKpi("crash_count", "crash_delta_pct"),
        requests311: toKpi("requests_311_count", "requests_311_delta_pct"),
      },
      lastUpdated: new Date().toISOString(),
      effectiveThrough,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 4: Fix existing KPI test (add mock for `getEffectiveThrough`)**

Update the existing `"returns KPI data with correct shape"` test — add a third mock after the totals mock:

```typescript
// getEffectiveThrough query
mockQuery.mockResolvedValueOnce([
  { effective_through: "2026-03-12" },
]);
```

**Step 5: Run tests and commit**

Run: `npm test -- --testPathPattern=api-city-pulse --verbose`
Expected: All PASS

```bash
git add app/api/city-pulse/kpis/route.ts __tests__/api-city-pulse.test.ts
git commit -m "feat: add effectiveThrough to city pulse KPIs API"
```

---

### Task 3: Add `effectiveThrough` to Environment AQI API

**Files:**
- Modify: `lib/queries/environment.ts`
- Modify: `app/api/environment/aqi/route.ts`
- Test: `__tests__/api-environment.test.ts`

**Step 1: Write the failing test**

Add to the `"GET /api/environment/aqi"` describe block:

```typescript
it("returns effectiveThrough from max AQI date", async () => {
  // current
  mockQuery.mockResolvedValueOnce([
    { date: "2026-03-14", aqi_max: 42, aqi_ozone: 38, aqi_pm25: 42, aqi_pm10: 20, category: "Good" },
  ]);
  // trend
  mockQuery.mockResolvedValueOnce([
    { date: "2026-03-13", aqi_max: 55, aqi_ozone: 50, aqi_pm25: 55, aqi_pm10: 30, category: "Moderate" },
    { date: "2026-03-14", aqi_max: 42, aqi_ozone: 38, aqi_pm25: 42, aqi_pm10: 20, category: "Good" },
  ]);
  // getAqiEffectiveThrough
  mockQuery.mockResolvedValueOnce([
    { effective_through: "2026-03-14" },
  ]);

  const res = await getAqi(req("http://localhost/api/environment/aqi?timeWindow=30d"));
  const body = await res.json();

  expect(body.effectiveThrough).toBe("2026-03-14");
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=api-environment -t "effectiveThrough" --verbose`
Expected: FAIL

**Step 3: Add `getAqiEffectiveThrough` to `lib/queries/environment.ts`**

Add after the `getAqiCurrent` function:

```typescript
export async function getAqiEffectiveThrough(tw: TimeWindow): Promise<string | null> {
  const days = daysForWindow(tw);
  const rows = await query<{ effective_through: string }>(
    `SELECT MAX(date)::text AS effective_through
     FROM mart_aqi_daily
     WHERE date >= CURRENT_DATE - $1::int`,
    [days]
  );
  return rows[0]?.effective_through ?? null;
}
```

**Step 4: Update AQI route**

Rewrite `app/api/environment/aqi/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAqiCurrent, getAqiTrend, getAqiEffectiveThrough } from "@/lib/queries/environment";
import type { TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tw = (request.nextUrl.searchParams.get("timeWindow") ?? "30d") as TimeWindow;

    const [current, trend, effectiveThrough] = await Promise.all([
      getAqiCurrent(),
      getAqiTrend(tw),
      getAqiEffectiveThrough(tw),
    ]);

    return NextResponse.json({
      data: {
        current: current
          ? { aqi: current.aqi_max, category: current.category }
          : null,
        trend: trend
          .filter((r) => !effectiveThrough || r.date <= effectiveThrough)
          .map((r) => ({
            date: r.date,
            aqiMax: r.aqi_max,
            aqiOzone: r.aqi_ozone,
            aqiPm25: r.aqi_pm25,
            aqiPm10: r.aqi_pm10,
            category: r.category,
          })),
      },
      lastUpdated: new Date().toISOString(),
      effectiveThrough,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 5: Fix existing AQI test (add third mock)**

Update `"returns current AQI and trend"` — add after the trend mock:

```typescript
// getAqiEffectiveThrough
mockQuery.mockResolvedValueOnce([
  { effective_through: "2026-03-13" },
]);
```

**Step 6: Run tests and commit**

Run: `npm test -- --testPathPattern=api-environment --verbose`
Expected: All PASS

```bash
git add lib/queries/environment.ts app/api/environment/aqi/route.ts __tests__/api-environment.test.ts
git commit -m "feat: add effectiveThrough to environment AQI API"
```

---

### Task 4: Update data hooks to extract freshness metadata

**Files:**
- Modify: `lib/hooks/use-city-pulse-data.ts`
- Modify: `lib/hooks/use-environment-data.ts`

**Step 1: Update `fetchJson` in `use-city-pulse-data.ts` to return full response**

The current `fetchJson` returns only `json.data`. We need a second helper to get metadata. Modify the hook:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  KpiData,
  TrendPoint,
  CategoryBreakdown,
  HeatmapCell,
  NeighborhoodRow,
  NarrativeData,
  TimeWindow,
} from "@/lib/types";

interface CityPulseData {
  kpis: { crime: KpiData; crashes: KpiData; requests311: KpiData } | null;
  trends: TrendPoint[];
  categories: Record<string, CategoryBreakdown[]>;
  heatmap: HeatmapCell[];
  neighborhoods: NeighborhoodRow[];
  narrative: NarrativeData | null;
  effectiveThrough: string | null;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

async function fetchMeta(url: string): Promise<{ lastUpdated: string | null; effectiveThrough: string | null }> {
  const res = await fetch(url);
  if (!res.ok) return { lastUpdated: null, effectiveThrough: null };
  const json = await res.json();
  return {
    lastUpdated: json.lastUpdated ?? null,
    effectiveThrough: json.effectiveThrough ?? null,
  };
}

export function useCityPulseData(
  timeWindow: TimeWindow,
  neighborhood: string
): CityPulseData {
  const [data, setData] = useState<Omit<CityPulseData, "retry">>({
    kpis: null,
    trends: [],
    categories: {},
    heatmap: [],
    neighborhoods: [],
    narrative: null,
    effectiveThrough: null,
    lastUpdated: null,
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const qs = `timeWindow=${timeWindow}${neighborhood !== "all" ? `&neighborhood=${encodeURIComponent(neighborhood)}` : ""}`;

      const trendsUrl = `/api/city-pulse/trends?${qs}`;

      const [kpis, trendsResp, categories, heatmap, neighborhoods, narrative] =
        await Promise.all([
          fetchJson<CityPulseData["kpis"]>(`/api/city-pulse/kpis?${qs}`),
          fetch(trendsUrl).then(async (r) => {
            if (!r.ok) throw new Error(`API error: ${r.status}`);
            return r.json();
          }),
          fetchJson<Record<string, CategoryBreakdown[]>>(
            `/api/city-pulse/categories?${qs}`
          ),
          fetchJson<HeatmapCell[]>(`/api/city-pulse/heatmap?${qs}`),
          fetchJson<NeighborhoodRow[]>(
            `/api/city-pulse/neighborhoods?timeWindow=${timeWindow}`
          ),
          fetchJson<NarrativeData>(`/api/city-pulse/narrative?${qs}`),
        ]);

      if (trendsResp.error) throw new Error(trendsResp.error);

      setData({
        kpis,
        trends: trendsResp.data.series,
        categories,
        heatmap,
        neighborhoods,
        narrative,
        effectiveThrough: trendsResp.effectiveThrough ?? null,
        lastUpdated: trendsResp.lastUpdated ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load data",
      }));
    }
  }, [timeWindow, neighborhood]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { ...data, retry: fetchAll };
}
```

**Step 2: Apply same pattern to `use-environment-data.ts`**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AqiDailyPoint,
  AqiCurrent,
  RankingRow,
  ComparisonRow,
  NarrativeData,
  TimeWindow,
} from "@/lib/types";

interface EnvironmentData {
  aqi: { current: AqiCurrent | null; trend: AqiDailyPoint[] };
  rankings: RankingRow[];
  comparison: ComparisonRow[];
  narrative: NarrativeData | null;
  effectiveThrough: string | null;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export function useEnvironmentData(
  timeWindow: TimeWindow,
  neighborhood: string
): EnvironmentData {
  const [data, setData] = useState<Omit<EnvironmentData, "retry">>({
    aqi: { current: null, trend: [] },
    rankings: [],
    comparison: [],
    narrative: null,
    effectiveThrough: null,
    lastUpdated: null,
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const qs = `timeWindow=${timeWindow}${neighborhood !== "all" ? `&neighborhood=${encodeURIComponent(neighborhood)}` : ""}`;

      const aqiUrl = `/api/environment/aqi?${qs}`;

      const [aqiResp, rankings, comparison, narrative] = await Promise.all([
        fetch(aqiUrl).then(async (r) => {
          if (!r.ok) throw new Error(`API error: ${r.status}`);
          return r.json();
        }),
        fetchJson<RankingRow[]>(
          `/api/environment/rankings?timeWindow=${timeWindow}`
        ),
        fetchJson<ComparisonRow[]>(`/api/environment/comparison?${qs}`),
        fetchJson<NarrativeData>(`/api/environment/narrative?${qs}`),
      ]);

      if (aqiResp.error) throw new Error(aqiResp.error);

      setData({
        aqi: aqiResp.data,
        rankings,
        comparison,
        narrative,
        effectiveThrough: aqiResp.effectiveThrough ?? null,
        lastUpdated: aqiResp.lastUpdated ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load data",
      }));
    }
  }, [timeWindow, neighborhood]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { ...data, retry: fetchAll };
}
```

**Step 3: Run build to verify no type errors**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds (pages will show type errors for unused props, fixed in Task 5)

**Step 4: Commit**

```bash
git add lib/hooks/use-city-pulse-data.ts lib/hooks/use-environment-data.ts
git commit -m "feat: extract effectiveThrough and lastUpdated in data hooks"
```

---

### Task 5: Update Header and PageShell to show freshness

**Files:**
- Modify: `components/layout/header.tsx`
- Modify: `components/layout/page-shell.tsx`
- Modify: `app/page.tsx`
- Modify: `app/environment/page.tsx`
- Test: `__tests__/header.test.tsx`

**Step 1: Write the failing test**

Add to `__tests__/header.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));

import { Header } from "@/components/layout/header";

describe("Header freshness display", () => {
  it("shows pipeline ran and data through dates", () => {
    render(
      <Header
        title="City Pulse"
        subtitle="Test"
        lastUpdated="2026-03-15T06:00:00.000Z"
        effectiveThrough="2026-03-09"
      />
    );

    expect(screen.getByText(/Pipeline ran:/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 15/)).toBeInTheDocument();
    expect(screen.getByText(/Data complete through:/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 9/)).toBeInTheDocument();
  });

  it("hides freshness when props are null", () => {
    render(<Header title="City Pulse" />);

    expect(screen.queryByText(/Pipeline ran:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Data complete through:/)).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=header --verbose`
Expected: FAIL — `effectiveThrough` is not a known prop

**Step 3: Update Header component**

Modify `components/layout/header.tsx`:

```typescript
"use client";

import { Suspense } from "react";
import { MobileNav } from "./mobile-nav";
import { TimeWindowFilter } from "./time-window-filter";
import { NeighborhoodFilter } from "./neighborhood-filter";
import { useFilters } from "@/lib/hooks/use-filters";
import { formatDateShort } from "@/lib/format";

interface HeaderProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string | null;
  effectiveThrough?: string | null;
}

function formatPipelineDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";
}

function HeaderInner({ title, subtitle, lastUpdated, effectiveThrough }: HeaderProps) {
  const { timeWindow, neighborhood, setTimeWindow, setNeighborhood } =
    useFilters();

  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 px-3 py-3 md:px-4 xl:px-5 xl:py-4">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <h1 className="text-lg font-bold text-[#102A43] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-[#627D98] mt-0.5">{subtitle}</p>
          )}
          {lastUpdated && (
            <p className="text-[10px] text-[#9FB3C8] mt-0.5">
              Pipeline ran: {formatPipelineDate(lastUpdated)}
            </p>
          )}
          {effectiveThrough && (
            <p className="text-[10px] text-[#9FB3C8]">
              Data complete through: {formatDateShort(effectiveThrough)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <TimeWindowFilter value={timeWindow} onChange={setTimeWindow} />
        <NeighborhoodFilter value={neighborhood} onChange={setNeighborhood} />
      </div>
    </header>
  );
}

export function Header(props: HeaderProps) {
  return (
    <Suspense
      fallback={
        <header className="flex items-center justify-between px-3 py-3 md:px-4 xl:px-5 xl:py-4">
          <h1 className="text-lg font-bold text-[#102A43]">{props.title}</h1>
        </header>
      }
    >
      <HeaderInner {...props} />
    </Suspense>
  );
}
```

**Step 4: Update PageShell to pass new props**

Modify `components/layout/page-shell.tsx`:

```typescript
"use client";

import { Header } from "./header";

interface PageShellProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string | null;
  effectiveThrough?: string | null;
  children: React.ReactNode;
}

export function PageShell({ title, subtitle, lastUpdated, effectiveThrough, children }: PageShellProps) {
  return (
    <div className="flex-1 min-h-screen bg-[#F4F6F8] overflow-auto">
      <Header title={title} subtitle={subtitle} lastUpdated={lastUpdated} effectiveThrough={effectiveThrough} />
      <div className="px-3 pb-6 md:px-4 xl:px-5 space-y-4">{children}</div>
    </div>
  );
}
```

**Step 5: Wire freshness into City Pulse page**

In `app/page.tsx`, the `PageShell` is rendered in `CityPulsePage()` (outside the data hook). Since the data hook lives in `CityPulseContent`, we need to restructure slightly. Move `PageShell` inside `CityPulseContent`:

Replace the entire `CityPulsePage` and `CityPulseContent` structure:

In `CityPulseContent`, add `effectiveThrough` and `lastUpdated` to the destructured hook result and wrap with `PageShell` there. But `PageShell` is currently in the outer component.

**Simpler approach**: Keep current structure, but pass freshness via a shared ref or lift state. Actually the simplest approach: make `CityPulseContent` accept callbacks to set freshness, and `CityPulsePage` holds the state.

Modify `app/page.tsx`:

```typescript
"use client";

import { Suspense, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { ChartCard } from "@/components/cards/chart-card";
import { NarrativeBlock } from "@/components/cards/narrative-block";
import { TrendChart } from "@/components/charts/trend-chart";
import { CategoryChart } from "@/components/charts/category-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { NeighborhoodRankingChart } from "@/components/charts/neighborhood-ranking-chart";
import { DenverMapDynamic } from "@/components/map/denver-map-dynamic";
import { useFilters } from "@/lib/hooks/use-filters";
import { useCityPulseData } from "@/lib/hooks/use-city-pulse-data";
import { ErrorCard } from "@/components/cards/error-card";
import geojson from "@/data/geo/denver-neighborhoods.json";

function CityPulseContent({
  onFreshness,
}: {
  onFreshness: (lastUpdated: string | null, effectiveThrough: string | null) => void;
}) {
  const { timeWindow, neighborhood } = useFilters();
  const { kpis, trends, categories, heatmap, neighborhoods, narrative, effectiveThrough, lastUpdated, loading, error, retry } =
    useCityPulseData(timeWindow, neighborhood);

  // Report freshness to parent (PageShell)
  const prevRef = React.useRef<string | null>(null);
  if (!loading && effectiveThrough !== prevRef.current) {
    prevRef.current = effectiveThrough;
    onFreshness(lastUpdated, effectiveThrough);
  }
  // ... rest unchanged
```

Actually, this is getting over-engineered. **Much simpler**: just move `PageShell` inside the content component. Both pages already are `"use client"`, so:

Modify `app/page.tsx` — merge `CityPulsePage` and `CityPulseContent` so that the data hook result drives the `PageShell` props directly:

```typescript
"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { ChartCard } from "@/components/cards/chart-card";
import { NarrativeBlock } from "@/components/cards/narrative-block";
import { TrendChart } from "@/components/charts/trend-chart";
import { CategoryChart } from "@/components/charts/category-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { NeighborhoodRankingChart } from "@/components/charts/neighborhood-ranking-chart";
import { DenverMapDynamic } from "@/components/map/denver-map-dynamic";
import { useFilters } from "@/lib/hooks/use-filters";
import { useCityPulseData } from "@/lib/hooks/use-city-pulse-data";
import { ErrorCard } from "@/components/cards/error-card";
import geojson from "@/data/geo/denver-neighborhoods.json";

function CityPulseContent() {
  const { timeWindow, neighborhood } = useFilters();
  const { kpis, trends, categories, heatmap, neighborhoods, narrative, effectiveThrough, lastUpdated, loading, error, retry } =
    useCityPulseData(timeWindow, neighborhood);

  if (error) {
    return (
      <PageShell title="City Pulse" subtitle="Crime, crashes, and 311 requests across Denver">
        <ErrorCard message={error} onRetry={retry} />
      </PageShell>
    );
  }

  const tagLabel = timeWindow.toUpperCase();

  return (
    <PageShell
      title="City Pulse"
      subtitle="Crime, crashes, and 311 requests across Denver"
      lastUpdated={lastUpdated}
      effectiveThrough={effectiveThrough}
    >
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          title="Crime Incidents"
          tag={tagLabel}
          value={kpis?.crime.value}
          deltaPercent={kpis?.crime.deltaPercent}
          sparklineData={kpis?.crime.sparkline}
          sparklineLabel="incidents"
          insight={kpis?.crime.insight}
          color="#2458C6"
          loading={loading}
        />
        <KpiCard
          title="Traffic Crashes"
          tag={tagLabel}
          value={kpis?.crashes.value}
          deltaPercent={kpis?.crashes.deltaPercent}
          sparklineData={kpis?.crashes.sparkline}
          sparklineLabel="crashes"
          insight={kpis?.crashes.insight}
          color="#D97904"
          loading={loading}
        />
        <KpiCard
          title="311 Requests"
          tag={tagLabel}
          value={kpis?.requests311.value}
          deltaPercent={kpis?.requests311.deltaPercent}
          sparklineData={kpis?.requests311.sparkline}
          sparklineLabel="requests"
          insight={kpis?.requests311.insight}
          color="#198754"
          loading={loading}
        />
      </div>

      {/* Hero Row — 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <ChartCard title="Incident Trends" loading={loading}>
            <TrendChart data={trends} />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <NarrativeBlock
            title={narrative?.title ?? "City Pulse Today"}
            content={narrative?.content ?? ""}
            stats={narrative?.stats}
            loading={loading}
          />
        </div>
      </div>

      {/* Lower Analytics — 2×2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard title="Category Breakdown" loading={loading}>
          <CategoryChart data={categories} />
        </ChartCard>
        <ChartCard title="Time Heatmap" loading={loading}>
          <HeatmapChart data={heatmap} />
        </ChartCard>
        <ChartCard title="Neighborhood Map" loading={loading}>
          <div className="h-64 md:h-[300px] -m-2 rounded-lg overflow-hidden">
            <DenverMapDynamic
              geojson={geojson as unknown as GeoJSON.FeatureCollection}
              data={neighborhoods}
              selectedNeighborhood={neighborhood !== "all" ? neighborhood : undefined}
            />
          </div>
        </ChartCard>
        <ChartCard title="Top Neighborhoods" loading={loading}>
          <NeighborhoodRankingChart data={neighborhoods} />
        </ChartCard>
      </div>
    </PageShell>
  );
}

export default function CityPulsePage() {
  return (
    <Suspense fallback={<CityPulseSkeleton />}>
      <CityPulseContent />
    </Suspense>
  );
}

function CityPulseSkeleton() {
  return (
    <PageShell title="City Pulse" subtitle="Crime, crashes, and 311 requests across Denver">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <KpiCard key={i} title="" value={0} color="#ccc" loading />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <ChartCard title="Incident Trends" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <NarrativeBlock title="" content="" loading />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <ChartCard key={i} title="" loading>
            <div className="h-48" />
          </ChartCard>
        ))}
      </div>
    </PageShell>
  );
}
```

**Step 6: Apply the same pattern to `app/environment/page.tsx`**

Move `PageShell` inside `EnvironmentContent`, passing `lastUpdated` and `effectiveThrough` from `useEnvironmentData`. Same structural change as City Pulse — `PageShell` wraps the content inside the data-aware component.

**Step 7: Run tests and commit**

Run: `npm test -- --testPathPattern=header --verbose`
Expected: All PASS

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds

```bash
git add components/layout/header.tsx components/layout/page-shell.tsx app/page.tsx app/environment/page.tsx __tests__/header.test.tsx
git commit -m "feat: show pipeline ran and data-through dates in header"
```

---

### Task 6: Replace hardcoded sidebar freshness text

**Files:**
- Modify: `components/layout/sidebar.tsx`
- Test: `__tests__/sidebar.test.tsx`

**Step 1: Write the failing test**

Add to `__tests__/sidebar.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Sidebar", () => {
  it("shows daily refresh schedule instead of hardcoded text", () => {
    render(<Sidebar />);
    const footer = screen.getByText(/Refreshed daily/);
    expect(footer).toBeInTheDocument();
  });
});
```

**Step 2: Update sidebar text**

In `components/layout/sidebar.tsx`, replace the hardcoded footer text (lines 84-88):

```typescript
<div className="hidden xl:block px-5 py-4 border-t border-[#E6E9EE]">
  <p className="text-[10px] text-[#9FB3C8]">
    Refreshed daily at 06:00 UTC
  </p>
  <p className="text-[10px] text-[#9FB3C8]">
    Crime & crash data delayed 5–7 days
  </p>
</div>
```

**Step 3: Run tests and commit**

Run: `npm test -- --testPathPattern=sidebar --verbose`
Expected: All PASS

```bash
git add components/layout/sidebar.tsx __tests__/sidebar.test.tsx
git commit -m "feat: add data delay notice to sidebar footer"
```

---

### Task 7: Final verification — lint, build, all tests

**Step 1: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 2: Run all tests**

Run: `npm test`
Expected: All pass

**Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Fix any issues found, then commit**

```bash
git add -A
git commit -m "chore: fix lint/type issues from data freshness feature"
```

(Only if there are fixes needed. Skip if clean.)

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | `getEffectiveThrough` query + trim trends API | `lib/queries/city-pulse.ts`, `app/api/city-pulse/trends/route.ts` |
| 2 | Add `effectiveThrough` to KPIs API | `app/api/city-pulse/kpis/route.ts` |
| 3 | Add `getAqiEffectiveThrough` + trim AQI API | `lib/queries/environment.ts`, `app/api/environment/aqi/route.ts` |
| 4 | Extract metadata in data hooks | `lib/hooks/use-city-pulse-data.ts`, `use-environment-data.ts` |
| 5 | Header two-line freshness + PageShell wiring | `header.tsx`, `page-shell.tsx`, `page.tsx`, `environment/page.tsx` |
| 6 | Sidebar dynamic text | `sidebar.tsx` |
| 7 | Final lint + build + test | — |
