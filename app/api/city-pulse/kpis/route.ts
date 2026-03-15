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

    const effectiveThrough = await getEffectiveThrough(tw);

    const [sparkline, totals] = await Promise.all([
      getKpiSparkline(tw, neighborhood),
      getKpiTotals(tw, neighborhood, effectiveThrough),
    ]);

    const trimmedSparkline = effectiveThrough
      ? sparkline.filter((r) => r.date <= effectiveThrough)
      : sparkline;

    const toKpi = (
      countKey: "crime_count" | "crash_count" | "requests_311_count",
      deltaKey: "crime_delta_pct" | "crash_delta_pct" | "requests_311_delta_pct"
    ) => ({
      value: totals?.[countKey] ?? 0,
      delta: 0,
      deltaPercent: totals?.[deltaKey] ?? null,
      sparkline: trimmedSparkline
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
