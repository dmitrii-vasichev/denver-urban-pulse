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
  const days = daysForWindow(tw);
  if (neighborhood === "all") {
    if (days <= 30) {
      return query<DailyRow>(
        `SELECT date::text, crime_count, crash_count, requests_311_count
         FROM mart_city_pulse_daily
         WHERE date > (SELECT MAX(date) FROM mart_city_pulse_daily) - $1::int
           AND date <= (SELECT MAX(date) FROM mart_city_pulse_daily)
         ORDER BY date DESC`,
        [days]
      );
    }
    // 90d: aggregate by week for a cleaner sparkline
    return query<DailyRow>(
      `SELECT DATE_TRUNC('week', date)::date::text AS date,
              SUM(crime_count)::int AS crime_count,
              SUM(crash_count)::int AS crash_count,
              SUM(requests_311_count)::int AS requests_311_count
       FROM mart_city_pulse_daily
       WHERE date > (SELECT MAX(date) FROM mart_city_pulse_daily) - $1::int
         AND date <= (SELECT MAX(date) FROM mart_city_pulse_daily)
       GROUP BY DATE_TRUNC('week', date)
       ORDER BY date DESC`,
      [days]
    );
  }
  // Neighborhood-specific sparkline from staging tables
  // Anchor to max available date from mart_city_pulse_daily
  if (days <= 30) {
    return query<DailyRow>(
      `WITH anchor AS (SELECT MAX(date) AS d FROM mart_city_pulse_daily)
       SELECT d.date::text,
              COALESCE(cr.cnt, 0)::int AS crime_count,
              COALESCE(ca.cnt, 0)::int AS crash_count,
              COALESCE(r.cnt, 0)::int AS requests_311_count
       FROM anchor,
            generate_series(
              anchor.d - $1::int + 1,
              anchor.d,
              '1 day'::interval
            ) AS d(date)
       LEFT JOIN (
         SELECT (reported_date AT TIME ZONE 'America/Denver')::date AS date, COUNT(*) AS cnt
         FROM stg_crime WHERE neighborhood = $2
           AND reported_date >= ((SELECT d FROM anchor) - $1::int)::date
         GROUP BY 1
       ) cr ON cr.date = d.date
       LEFT JOIN (
         SELECT (reported_date AT TIME ZONE 'America/Denver')::date AS date, COUNT(*) AS cnt
         FROM stg_crashes WHERE neighborhood = $2
           AND reported_date >= ((SELECT d FROM anchor) - $1::int)::date
         GROUP BY 1
       ) ca ON ca.date = d.date
       LEFT JOIN (
         SELECT (case_created_date AT TIME ZONE 'America/Denver')::date AS date, COUNT(*) AS cnt
         FROM stg_311 WHERE neighborhood = $2
           AND case_created_date >= ((SELECT d FROM anchor) - $1::int)::date
         GROUP BY 1
       ) r ON r.date = d.date
       ORDER BY d.date DESC`,
      [days, neighborhood]
    );
  }
  // 90d + neighborhood: aggregate by week
  return query<DailyRow>(
    `WITH anchor AS (SELECT MAX(date) AS d FROM mart_city_pulse_daily)
     SELECT DATE_TRUNC('week', d.date)::date::text AS date,
            SUM(COALESCE(cr.cnt, 0))::int AS crime_count,
            SUM(COALESCE(ca.cnt, 0))::int AS crash_count,
            SUM(COALESCE(r.cnt, 0))::int AS requests_311_count
     FROM anchor,
          generate_series(
            anchor.d - $1::int + 1,
            anchor.d,
            '1 day'::interval
          ) AS d(date)
     LEFT JOIN (
       SELECT (reported_date AT TIME ZONE 'America/Denver')::date AS date, COUNT(*) AS cnt
       FROM stg_crime WHERE neighborhood = $2
         AND reported_date >= ((SELECT d FROM anchor) - $1::int)::date
       GROUP BY 1
     ) cr ON cr.date = d.date
     LEFT JOIN (
       SELECT (reported_date AT TIME ZONE 'America/Denver')::date AS date, COUNT(*) AS cnt
       FROM stg_crashes WHERE neighborhood = $2
         AND reported_date >= ((SELECT d FROM anchor) - $1::int)::date
       GROUP BY 1
     ) ca ON ca.date = d.date
     LEFT JOIN (
       SELECT (case_created_date AT TIME ZONE 'America/Denver')::date AS date, COUNT(*) AS cnt
       FROM stg_311 WHERE neighborhood = $2
         AND case_created_date >= ((SELECT d FROM anchor) - $1::int)::date
       GROUP BY 1
     ) r ON r.date = d.date
     GROUP BY DATE_TRUNC('week', d.date)
     ORDER BY date DESC`,
    [days, neighborhood]
  );
}

export async function getKpiTotals(
  tw: TimeWindow,
  neighborhood: string,
  effectiveThrough?: string | null
): Promise<NeighborhoodTotalRow | null> {
  if (neighborhood === "all") {
    const days = daysForWindow(tw);
    const upperBound = effectiveThrough
      ? `$2::date + 1`
      : `(SELECT MAX(date) + 1 FROM mart_city_pulse_daily)`;
    const prevUpperBound = effectiveThrough
      ? `$2::date + 1 - $1::int`
      : `(SELECT MAX(date) + 1 FROM mart_city_pulse_daily) - $1::int`;
    const params: (number | string)[] = effectiveThrough
      ? [days, effectiveThrough]
      : [days];
    const rows = await query<NeighborhoodTotalRow>(
      `WITH cur AS (
         SELECT COALESCE(SUM(crime_count), 0)::int AS crime_count,
                COALESCE(SUM(crash_count), 0)::int AS crash_count,
                COALESCE(SUM(requests_311_count), 0)::int AS requests_311_count
         FROM mart_city_pulse_daily
         WHERE date >= ${upperBound} - $1::int
           AND date < ${upperBound}
       ),
       prev AS (
         SELECT COALESCE(SUM(crime_count), 0)::int AS crime_count,
                COALESCE(SUM(crash_count), 0)::int AS crash_count,
                COALESCE(SUM(requests_311_count), 0)::int AS requests_311_count
         FROM mart_city_pulse_daily
         WHERE date >= ${prevUpperBound} - $1::int
           AND date < ${prevUpperBound}
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
      params
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

export async function getEffectiveThrough(_tw: TimeWindow): Promise<string | null> {
  const rows = await query<{ effective_through: string | null }>(
    `SELECT MIN(max_date)::text AS effective_through
     FROM (
       SELECT domain, MAX(date) AS max_date
       FROM mart_incident_trends
       GROUP BY domain
     ) sub`
  );
  return rows[0]?.effective_through ?? null;
}

// --- Category Trends (sparklines per category) ---

interface CategoryTrendRow {
  domain: string;
  category: string;
  date: string;
  count: number;
}

export async function getCategoryTrends(
  tw: TimeWindow
): Promise<CategoryTrendRow[]> {
  const days = daysForWindow(tw);
  if (days <= 30) {
    return query<CategoryTrendRow>(
      `SELECT domain, category, date::text, count
       FROM mart_incident_trends
       WHERE date > (SELECT MAX(date) FROM mart_incident_trends) - $1::int
         AND date <= (SELECT MAX(date) FROM mart_incident_trends)
       ORDER BY domain, category, date`,
      [days]
    );
  }
  // 90d: aggregate by week for cleaner sparklines
  return query<CategoryTrendRow>(
    `SELECT domain, category,
            DATE_TRUNC('week', date)::date::text AS date,
            SUM(count)::int AS count
     FROM mart_incident_trends
     WHERE date > (SELECT MAX(date) FROM mart_incident_trends) - $1::int
       AND date <= (SELECT MAX(date) FROM mart_incident_trends)
     GROUP BY domain, category, DATE_TRUNC('week', date)
     ORDER BY domain, category, date`,
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
      `SELECT day_of_week, hour_of_day, ROUND(AVG(count))::int AS count
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
