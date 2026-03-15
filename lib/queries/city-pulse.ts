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
       WHERE date >= (NOW() AT TIME ZONE 'America/Denver')::date - $1::int
         AND date < (NOW() AT TIME ZONE 'America/Denver')::date
       ORDER BY date DESC`,
      [days]
    );
  }
  // When neighborhood filter is set, fall back to full daily data
  return query<DailyRow>(
    `SELECT date::text, crime_count, crash_count, requests_311_count
     FROM mart_city_pulse_daily
     WHERE date >= (NOW() AT TIME ZONE 'America/Denver')::date - $1::int
       AND date < (NOW() AT TIME ZONE 'America/Denver')::date
     ORDER BY date DESC`,
    [days]
  );
}

export async function getKpiTotals(
  tw: TimeWindow,
  neighborhood: string
): Promise<NeighborhoodTotalRow | null> {
  if (neighborhood === "all") {
    const days = daysForWindow(tw);
    const rows = await query<NeighborhoodTotalRow>(
      `WITH cur AS (
         SELECT COALESCE(SUM(crime_count), 0)::int AS crime_count,
                COALESCE(SUM(crash_count), 0)::int AS crash_count,
                COALESCE(SUM(requests_311_count), 0)::int AS requests_311_count
         FROM mart_city_pulse_daily
         WHERE date >= (NOW() AT TIME ZONE 'America/Denver')::date - $1::int
       ),
       prev AS (
         SELECT COALESCE(SUM(crime_count), 0)::int AS crime_count,
                COALESCE(SUM(crash_count), 0)::int AS crash_count,
                COALESCE(SUM(requests_311_count), 0)::int AS requests_311_count
         FROM mart_city_pulse_daily
         WHERE date >= (NOW() AT TIME ZONE 'America/Denver')::date - $1::int * 2
           AND date < (NOW() AT TIME ZONE 'America/Denver')::date - $1::int
       )
       SELECT
         cur.crime_count,
         cur.crash_count,
         cur.requests_311_count,
         CASE WHEN prev.crime_count > 0
              THEN ROUND(((cur.crime_count - prev.crime_count)::numeric / prev.crime_count) * 100, 1)
              ELSE NULL END AS crime_delta_pct,
         CASE WHEN prev.crash_count > 0
              THEN ROUND(((cur.crash_count - prev.crash_count)::numeric / prev.crash_count) * 100, 1)
              ELSE NULL END AS crash_delta_pct,
         CASE WHEN prev.requests_311_count > 0
              THEN ROUND(((cur.requests_311_count - prev.requests_311_count)::numeric / prev.requests_311_count) * 100, 1)
              ELSE NULL END AS requests_311_delta_pct
       FROM cur, prev`,
      [days]
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
     WHERE date >= (NOW() AT TIME ZONE 'America/Denver')::date - $1::int
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
