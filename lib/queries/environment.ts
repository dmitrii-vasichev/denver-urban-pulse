import { query } from "@/lib/db";
import type { TimeWindow } from "@/lib/types";

function daysForWindow(tw: TimeWindow): number {
  return tw === "7d" ? 7 : tw === "30d" ? 30 : 90;
}

// --- AQI ---

interface AqiRow {
  date: string;
  aqi_max: number | null;
  aqi_ozone: number | null;
  aqi_pm25: number | null;
  aqi_pm10: number | null;
  category: string | null;
}

export async function getAqiTrend(tw: TimeWindow): Promise<AqiRow[]> {
  const days = daysForWindow(tw);
  return query<AqiRow>(
    `SELECT date::text, aqi_max, aqi_ozone, aqi_pm25, aqi_pm10, category
     FROM mart_aqi_daily
     WHERE date >= CURRENT_DATE - $1::int
     ORDER BY date`,
    [days]
  );
}

export async function getAqiCurrent(): Promise<AqiRow | null> {
  const rows = await query<AqiRow>(
    `SELECT date::text, aqi_max, aqi_ozone, aqi_pm25, aqi_pm10, category
     FROM mart_aqi_daily
     ORDER BY date DESC LIMIT 1`
  );
  return rows[0] ?? null;
}

export async function getAqiEffectiveThrough(tw: TimeWindow): Promise<string | null> {
  const days = daysForWindow(tw);
  const rows = await query<{ effective_through: string }>(
    `SELECT MAX(date)::text AS effective_through
     FROM mart_aqi_daily
     WHERE date >= CURRENT_DATE - $1::int`,
    [days]
  );
  return rows[0]?.effective_through ?? null;
}

// --- Comparison ---

interface ComparisonRow {
  neighborhood: string;
  crime_rate: number | null;
  crash_rate: number | null;
  requests_311_rate: number | null;
  crime_delta_pct: number | null;
  crash_delta_pct: number | null;
  requests_311_delta_pct: number | null;
}

export async function getComparison(
  tw: TimeWindow,
  neighborhoods: string[]
): Promise<ComparisonRow[]> {
  if (neighborhoods.length === 0) {
    return query<ComparisonRow>(
      `SELECT neighborhood, crime_rate, crash_rate, requests_311_rate,
              crime_delta_pct, crash_delta_pct, requests_311_delta_pct
       FROM mart_neighborhood_comparison
       WHERE period = $1
       ORDER BY neighborhood`,
      [tw]
    );
  }
  return query<ComparisonRow>(
    `SELECT neighborhood, crime_rate, crash_rate, requests_311_rate,
            crime_delta_pct, crash_delta_pct, requests_311_delta_pct
     FROM mart_neighborhood_comparison
     WHERE period = $1 AND neighborhood = ANY($2)
     ORDER BY neighborhood`,
    [tw, neighborhoods]
  );
}

