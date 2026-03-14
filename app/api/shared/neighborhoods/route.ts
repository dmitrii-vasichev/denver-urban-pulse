import { NextResponse } from "next/server";
import { getNeighborhoods } from "@/lib/queries/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const names = await getNeighborhoods();
    const data = names.map((name) => ({ name }));
    return NextResponse.json(
      { data, lastUpdated: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: [], lastUpdated: null, error: message },
      { status: 500 }
    );
  }
}
