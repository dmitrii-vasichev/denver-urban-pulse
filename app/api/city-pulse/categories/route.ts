import { NextRequest, NextResponse } from "next/server";
import { getCategories } from "@/lib/queries/city-pulse";
import type { TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tw = (request.nextUrl.searchParams.get("timeWindow") ?? "30d") as TimeWindow;
    const neighborhood = request.nextUrl.searchParams.get("neighborhood") ?? "all";
    const rows = await getCategories(tw, neighborhood);

    const grouped: Record<string, { category: string; count: number; percent: number }[]> = {
      crime: [],
      crashes: [],
      requests311: [],
    };

    for (const r of rows) {
      const key = r.domain === "311" ? "requests311" : r.domain;
      if (key in grouped) {
        grouped[key].push({
          category: r.category,
          count: r.count,
          percent: r.pct_of_total,
        });
      }
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
