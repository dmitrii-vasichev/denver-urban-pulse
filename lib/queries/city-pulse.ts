import { query } from "@/lib/db";
import type { TimeWindow } from "@/lib/types";

function daysForWindow(tw: TimeWindow): number {
  return tw === "7d" ? 7 : tw === "30d" ? 30 : 90;
}

// --- KPIs ---

interface DailyRow {
  date: string;
  crime_count: number;
  crash_count: number;
  requests_311_count: number;
}

interface NeighborhoodTotalRow {
  crime_count: number;
  crash_count: number;
  requests_311_count: number;
  crime_delta_pct: number | null;
  crash_delta_pct: number | null;
  requests_311_delta_pct: number | null;
}

export async function getKpiSparkline(
  tw: TimeWindow,
  neighborhood: string
): Promise<DailyRow[]> {
  const days = Math.min(daysForWindow(tw), 30);
  if (neighborhood === "all") {
    return query<DailyRow>(
      `SELECT date::text, crime_count, crash_count, requests_311_count
       FROM mart_city_pulse_daily
       ORDER BY date DESC LIMIT $1`,
      [days]
    );
  }
  // When neighborhood filter is set, fall back to full daily data
  return query<DailyRow>(
    `SELECT date::text, crime_count, crash_count, requests_311_count
     FROM mart_city_pulse_daily
     ORDER BY date DESC LIMIT $1`,
    [days]
  );
}

export async function getKpiTotals(
  tw: TimeWindow,
  neighborhood: string
): Promise<NeighborhoodTotalRow | null> {
  if (neighborhood === "all") {
    const rows = await query<NeighborhoodTotalRow>(
      `SELECT SUM(crime_count)::int AS crime_count,
              SUM(crash_count)::int AS crash_count,
              SUM(requests_311_count)::int AS requests_311_count,
              AVG(crime_delta_pct) AS crime_delta_pct,
              AVG(crash_delta_pct) AS crash_delta_pct,
              AVG(requests_311_delta_pct) AS requests_311_delta_pct
       FROM mart_city_pulse_neighborhood
       WHERE period = $1`,
      [tw]
    );
    return rows[0] ?? null;
  }
  const rows = await query<NeighborhoodTotalRow>(
    `SELECT crime_count, crash_count, requests_311_count,
            crime_delta_pct, crash_delta_pct, requests_311_delta_pct
     FROM mart_city_pulse_neighborhood
     WHERE period = $1 AND neighborhood = $2`,
    [tw, neighborhood]
  );
  return rows[0] ?? null;
}

// --- Trends ---

interface TrendRow {
  date: string;
  domain: string;
  count: number;
}

export async function getTrends(tw: TimeWindow): Promise<TrendRow[]> {
  const days = daysForWindow(tw);
  return query<TrendRow>(
    `SELECT date::text, domain, SUM(count)::int AS count
     FROM mart_incident_trends
     WHERE date >= CURRENT_DATE - $1::int
     GROUP BY date, domain
     ORDER BY date`,
    [days]
  );
}

// --- Categories ---

interface CategoryRow {
  domain: string;
  category: string;
  count: number;
  pct_of_total: number;
}

export async function getCategories(tw: TimeWindow): Promise<CategoryRow[]> {
  return query<CategoryRow>(
    `SELECT domain, category, count, pct_of_total
     FROM mart_category_breakdown
     WHERE period = $1
     ORDER BY domain, count DESC`,
    [tw]
  );
}

// --- Heatmap ---

interface HeatmapRow {
  day_of_week: number;
  hour_of_day: number;
  count: number;
}

export async function getHeatmap(
  tw: TimeWindow,
  domain: string
): Promise<HeatmapRow[]> {
  if (domain === "all") {
    return query<HeatmapRow>(
      `SELECT day_of_week, hour_of_day, SUM(count)::int AS count
       FROM mart_heatmap_hour_day
       WHERE period = $1
       GROUP BY day_of_week, hour_of_day
       ORDER BY day_of_week, hour_of_day`,
      [tw]
    );
  }
  return query<HeatmapRow>(
    `SELECT day_of_week, hour_of_day, count
     FROM mart_heatmap_hour_day
     WHERE period = $1 AND domain = $2
     ORDER BY day_of_week, hour_of_day`,
    [tw, domain]
  );
}

// --- Neighborhoods ---

interface NeighborhoodBreakdownRow {
  neighborhood: string;
  crime_count: number;
  crash_count: number;
  requests_311_count: number;
  total_delta_pct: number | null;
}

export async function getNeighborhoodBreakdown(
  tw: TimeWindow
): Promise<NeighborhoodBreakdownRow[]> {
  return query<NeighborhoodBreakdownRow>(
    `SELECT neighborhood, crime_count, crash_count, requests_311_count, total_delta_pct
     FROM mart_city_pulse_neighborhood
     WHERE period = $1
     ORDER BY (crime_count + crash_count + requests_311_count) DESC`,
    [tw]
  );
}

// --- Narrative ---

interface NarrativeRow {
  signal_type: string;
  signal_key: string | null;
  signal_value: string | null;
  signal_numeric: number | null;
}

export async function getNarrativeSignals(
  tw: TimeWindow
): Promise<NarrativeRow[]> {
  return query<NarrativeRow>(
    `SELECT signal_type, signal_key, signal_value, signal_numeric
     FROM mart_narrative_signals
     WHERE period = $1
     ORDER BY signal_type, rank`,
    [tw]
  );
}
