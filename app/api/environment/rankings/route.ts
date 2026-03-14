import { NextRequest, NextResponse } from "next/server";
import { getRankings } from "@/lib/queries/environment";
import type { TimeWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tw = (request.nextUrl.searchParams.get("timeWindow") ?? "30d") as TimeWindow;
    const rows = await getRankings(tw);

    const data = rows.map((r) => ({
      neighborhood: r.neighborhood,
      crimeCount: r.crime_count,
      crashCount: r.crash_count,
      requests311Count: r.requests_311_count,
      compositeScore: r.composite_score,
      rank: r.rank,
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
