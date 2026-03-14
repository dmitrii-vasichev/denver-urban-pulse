import { NextRequest, NextResponse } from "next/server";
import { getAqiCurrent, getAqiTrend } from "@/lib/queries/environment";
import type { TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tw = (request.nextUrl.searchParams.get("timeWindow") ?? "30d") as TimeWindow;

    const [current, trend] = await Promise.all([
      getAqiCurrent(),
      getAqiTrend(tw),
    ]);

    return NextResponse.json({
      data: {
        current: current
          ? { aqi: current.aqi_max, category: current.category }
          : null,
        trend: trend.map((r) => ({
          date: r.date,
          aqiMax: r.aqi_max,
          aqiOzone: r.aqi_ozone,
          aqiPm25: r.aqi_pm25,
          aqiPm10: r.aqi_pm10,
          category: r.category,
        })),
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
