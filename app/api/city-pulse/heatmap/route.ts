import { NextRequest, NextResponse } from "next/server";
import { getHeatmap } from "@/lib/queries/city-pulse";
import type { TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const tw = (params.get("timeWindow") ?? "30d") as TimeWindow;
    const domain = params.get("domain") ?? "all";

    const rows = await getHeatmap(tw, domain);
    const data = rows.map((r) => ({
      dayOfWeek: r.day_of_week,
      hourOfDay: r.hour_of_day,
      count: r.count,
    }));

    return NextResponse.json({
      data,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
