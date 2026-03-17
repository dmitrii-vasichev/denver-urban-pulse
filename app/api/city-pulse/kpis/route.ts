import { NextRequest, NextResponse } from "next/server";
import { getKpiSparkline, getKpiTotals, getKpiTotalsPerDomain, getDomainFreshness } from "@/lib/queries/city-pulse";
import type { TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_WINDOWS: TimeWindow[] = ["7d", "30d", "90d"];

function daysForWindow(tw: TimeWindow): number {
  return tw === "7d" ? 7 : tw === "30d" ? 30 : 90;
}

// Subtract N days from a YYYY-MM-DD date string, return YYYY-MM-DD
function subtractDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n + 1);
  return d.toISOString().split("T")[0];
}

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

    const days = daysForWindow(tw);
    const domainFreshness = await getDomainFreshness();
    const dates = [domainFreshness.crime, domainFreshness.crashes, domainFreshness.requests311].filter(Boolean) as string[];
    const effectiveThrough = dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null;

    // Per-domain date ranges: each domain anchored to its own max date
    const domainDateRanges = {
      crime: domainFreshness.crime
        ? { from: subtractDays(domainFreshness.crime, days), to: domainFreshness.crime }
        : null,
      crashes: domainFreshness.crashes
        ? { from: subtractDays(domainFreshness.crashes, days), to: domainFreshness.crashes }
        : null,
      requests311: domainFreshness.requests311
        ? { from: subtractDays(domainFreshness.requests311, days), to: domainFreshness.requests311 }
        : null,
    };

    // Compute sparkline range that covers all domains
    const allFroms = [domainDateRanges.crime?.from, domainDateRanges.crashes?.from, domainDateRanges.requests311?.from].filter(Boolean) as string[];
    const allTos = dates;
    const sparklineRange = allFroms.length > 0 && allTos.length > 0
      ? { from: allFroms.reduce((a, b) => (a < b ? a : b)), to: allTos.reduce((a, b) => (a > b ? a : b)) }
      : null;

    // For city-wide: use per-domain totals; for neighborhood: use shared effectiveThrough
    const [sparkline, totals] = await Promise.all([
      getKpiSparkline(tw, neighborhood, neighborhood === "all" ? sparklineRange : null),
      neighborhood === "all"
        ? getKpiTotalsPerDomain(tw, domainFreshness)
        : getKpiTotals(tw, neighborhood, effectiveThrough),
    ]);

    // Per-domain sparkline trimming: each domain gets only its own date range
    const trimSparkline = (
      countKey: "crime_count" | "crash_count" | "requests_311_count",
      range: { from: string; to: string } | null
    ) => {
      const filtered = range
        ? sparkline.filter((r) => r.date >= range.from && r.date <= range.to)
        : sparkline;
      return filtered
        .map((r) => ({ date: r.date, value: r[countKey] }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    const toKpi = (
      countKey: "crime_count" | "crash_count" | "requests_311_count",
      deltaKey: "crime_delta_pct" | "crash_delta_pct" | "requests_311_delta_pct",
      domainKey: "crime" | "crashes" | "requests311"
    ) => ({
      value: totals?.[countKey] ?? 0,
      delta: 0,
      deltaPercent: totals?.[deltaKey] ?? null,
      sparkline: trimSparkline(countKey, domainDateRanges[domainKey]),
      insight: "",
      tag: tw,
      dateRange: domainDateRanges[domainKey],
    });

    return NextResponse.json({
      data: {
        crime: toKpi("crime_count", "crime_delta_pct", "crime"),
        crashes: toKpi("crash_count", "crash_delta_pct", "crashes"),
        requests311: toKpi("requests_311_count", "requests_311_delta_pct", "requests311"),
      },
      lastUpdated: new Date().toISOString(),
      effectiveThrough,
      domainFreshness,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
