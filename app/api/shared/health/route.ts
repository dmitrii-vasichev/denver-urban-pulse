import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/db";
import { getSourceTimestamps } from "@/lib/queries/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ok = await healthCheck();
    const sources = await getSourceTimestamps();

    const latestValues = Object.values(sources).filter(Boolean) as string[];
    const lastUpdated =
      latestValues.length > 0
        ? latestValues.sort().reverse()[0]
        : null;

    return NextResponse.json(
      {
        ok,
        lastUpdated,
        sources: {
          crime: sources["crime"] ?? null,
          crashes: sources["crashes"] ?? null,
          "311": sources["311"] ?? null,
          aqi: sources["aqi"] ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, lastUpdated: null, sources: {}, error: message },
      { status: 500 }
    );
  }
}
