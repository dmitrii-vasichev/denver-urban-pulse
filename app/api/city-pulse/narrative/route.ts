import { NextRequest, NextResponse } from "next/server";
import { getNarrativeSignals } from "@/lib/queries/city-pulse";
import type { TimeWindow, NarrativeData } from "@/lib/types";

export const dynamic = "force-dynamic";

function assembleNarrative(
  signals: { signal_type: string; signal_key: string | null; signal_value: string | null; signal_numeric: number | null }[]
): NarrativeData {
  const byType = new Map<string, typeof signals>();
  for (const s of signals) {
    if (!byType.has(s.signal_type)) byType.set(s.signal_type, []);
    byType.get(s.signal_type)!.push(s);
  }

  const parts: string[] = [];
  const stats: { label: string; value: string }[] = [];

  const topDomain = byType.get("top_domain")?.[0];
  if (topDomain) {
    parts.push(
      `${topDomain.signal_value ?? topDomain.signal_key} leads incident volume with ${topDomain.signal_numeric?.toLocaleString() ?? "N/A"} reports.`
    );
    stats.push({
      label: topDomain.signal_key ?? "Top",
      value: topDomain.signal_numeric?.toLocaleString() ?? "—",
    });
  }

  const topNeighborhood = byType.get("top_neighborhood")?.[0];
  if (topNeighborhood) {
    parts.push(
      `${topNeighborhood.signal_key} is the most active neighborhood.`
    );
    stats.push({
      label: topNeighborhood.signal_key ?? "Neighborhood",
      value: topNeighborhood.signal_numeric?.toLocaleString() ?? "—",
    });
  }

  const topCategory = byType.get("top_category")?.[0];
  if (topCategory) {
    parts.push(
      `Top category: ${topCategory.signal_key} (${topCategory.signal_value}).`
    );
  }

  return {
    title: "City Pulse Today",
    content: parts.join(" ") || "No narrative data available for this period.",
    stats,
  };
}

export async function GET(request: NextRequest) {
  try {
    const tw = (request.nextUrl.searchParams.get("timeWindow") ?? "30d") as TimeWindow;
    const signals = await getNarrativeSignals(tw);
    const data = assembleNarrative(signals);

    return NextResponse.json({
      data,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
