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
      effectiveThrough,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
