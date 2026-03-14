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

// --- Rankings ---

interface RankingRow {
  neighborhood: string;
  crime_count: number;
  crash_count: number;
  requests_311_count: number;
  composite_score: number;
  rank: number;
}

export async function getRankings(tw: TimeWindow): Promise<RankingRow[]> {
  return query<RankingRow>(
    `SELECT neighborhood, crime_count, crash_count, requests_311_count,
            composite_score, rank
     FROM mart_neighborhood_ranking
     WHERE period = $1
     ORDER BY composite_score DESC`,
    [tw]
  );
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

// --- Narrative ---

interface NarrativeRow {
  signal_type: string;
  signal_key: string | null;
  signal_value: string | null;
  signal_numeric: number | null;
}

export async function getEnvironmentNarrativeSignals(
  tw: TimeWindow
): Promise<NarrativeRow[]> {
  return query<NarrativeRow>(
    `SELECT signal_type, signal_key, signal_value, signal_numeric
     FROM mart_narrative_signals
     WHERE period = $1 AND signal_type LIKE 'aqi%'
     ORDER BY signal_type, rank`,
    [tw]
  );
}
