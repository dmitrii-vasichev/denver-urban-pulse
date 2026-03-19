import { NextRequest, NextResponse } from "next/server";
import { getCategoryTrends } from "@/lib/queries/city-pulse";
import type { TimeWindow, ChartPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tw = (request.nextUrl.searchParams.get("timeWindow") ?? "30d") as TimeWindow;
    const neighborhood = request.nextUrl.searchParams.get("neighborhood") ?? "all";
    const rows = await getCategoryTrends(tw, neighborhood);

    // Group: domain → category → ChartPoint[]
    const grouped: Record<string, Record<string, ChartPoint[]>> = {};

    for (const r of rows) {
      const key = r.domain === "311" ? "requests311" : r.domain;
      if (!grouped[key]) grouped[key] = {};
      if (!grouped[key][r.category]) grouped[key][r.category] = [];
      grouped[key][r.category].push({ date: r.date, value: r.count });
    }

    return NextResponse.json({
      data: grouped,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
