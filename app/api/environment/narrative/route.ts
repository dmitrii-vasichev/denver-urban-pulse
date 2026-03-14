import { NextRequest, NextResponse } from "next/server";
import { getEnvironmentNarrativeSignals } from "@/lib/queries/environment";
import type { TimeWindow, NarrativeData } from "@/lib/types";

export const dynamic = "force-dynamic";

function assembleNarrative(
  signals: { signal_type: string; signal_key: string | null; signal_value: string | null; signal_numeric: number | null }[]
): NarrativeData {
  const parts: string[] = [];
  const stats: { label: string; value: string }[] = [];

  const aqiStatus = signals.find((s) => s.signal_type === "aqi_status");
  if (aqiStatus) {
    parts.push(
      `Air quality is ${aqiStatus.signal_value ?? "unknown"} with an AQI of ${aqiStatus.signal_numeric ?? "N/A"}.`
    );
    stats.push({
      label: "AQI",
      value: String(aqiStatus.signal_numeric ?? "—"),
    });
  }

  for (const s of signals) {
    if (s.signal_type !== "aqi_status" && s.signal_value) {
      parts.push(s.signal_value);
    }
  }

  return {
    title: "Environment Today",
    content: parts.join(" ") || "No air quality data available for this period.",
    stats,
  };
}

export async function GET(request: NextRequest) {
  try {
    const tw = (request.nextUrl.searchParams.get("timeWindow") ?? "30d") as TimeWindow;
    const signals = await getEnvironmentNarrativeSignals(tw);
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
