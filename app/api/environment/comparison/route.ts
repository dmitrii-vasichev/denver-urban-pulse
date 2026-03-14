import { NextRequest, NextResponse } from "next/server";
import { getComparison } from "@/lib/queries/environment";
import type { TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const tw = (params.get("timeWindow") ?? "30d") as TimeWindow;
    const nbParam = params.get("neighborhoods") ?? "";
    const neighborhoods = nbParam ? nbParam.split(",").map((s) => s.trim()) : [];

    const rows = await getComparison(tw, neighborhoods);

    const data = rows.map((r) => ({
      neighborhood: r.neighborhood,
      crimeRate: r.crime_rate,
      crashRate: r.crash_rate,
      requests311Rate: r.requests_311_rate,
      crimeDeltaPct: r.crime_delta_pct,
      crashDeltaPct: r.crash_delta_pct,
      requests311DeltaPct: r.requests_311_delta_pct,
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
