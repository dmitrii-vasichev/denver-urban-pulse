import { query } from "@/lib/db";
import type { TimeWindow } from "@/lib/types";

function daysForWindow(tw: TimeWindow): number {
  return tw === "7d" ? 7 : tw === "30d" ? 30 : 90;
}

// Category label SQL fragments — must match data/marts/build_category_breakdown.py
const CRIME_LABEL_SQL = `
  CASE COALESCE(offense_category, 'unknown')
    WHEN 'all-other-crimes'        THEN 'Other'
    WHEN 'theft-from-motor-vehicle' THEN 'Vehicle Theft'
    WHEN 'white-collar-crime'       THEN 'White-Collar Crime'
    WHEN 'murder'                   THEN 'Homicide'
    ELSE INITCAP(REPLACE(COALESCE(offense_category, 'Unknown'), '-', ' '))
  END`;

const CRASH_LABEL_SQL = `
  CASE TRIM(COALESCE(top_offense, 'Unknown'))
    WHEN 'TRAF - ACCIDENT'             THEN 'Traffic Accident'
    WHEN 'TRAF - ACCIDENT - HIT & RUN' THEN 'Hit & Run'
    WHEN 'TRAF - ACCIDENT - DUI/DUID'  THEN 'DUI / DUID'
    WHEN 'TRAF - ACCIDENT - SBI'       THEN 'Serious Bodily Injury'
    WHEN 'TRAF - ACCIDENT - POLICE'    THEN 'Police Involved'
    WHEN 'TRAF - ACCIDENT - FATAL'     THEN 'Fatal Crash'
    WHEN 'TRAF - HABITUAL OFFENDER'    THEN 'Habitual Offender'
    ELSE INITCAP(REPLACE(
      REPLACE(TRIM(COALESCE(top_offense, 'Unknown')), 'TRAF - ACCIDENT - ', ''),
      '-', ' '
    ))
  END`;

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
  neighborhood: string,
  dateRange?: { from: string; to: string } | null
): Promise<DailyRow[]> {
  const days = daysForWindow(tw);
  if (neighborhood === "all") {
    // When dateRange is provided, use explicit bounds to cover all per-domain windows
    if (dateRange) {
      if (days <= 30) {
        return query<DailyRow>(
          `SELECT date::text, crime_count, crash_count, requests_311_count
           FROM mart_city_pulse_daily
           WHERE date >= $1::date AND date <= $2::date
           ORDER BY date DESC`,
          [dateRange.from, dateRange.to]
        );
      }
      return query<DailyRow>(
        `SELECT DATE_TRUNC('week', date)::date::text AS date,
                SUM(crime_count)::int AS crime_count,
                SUM(crash_count)::int AS crash_count,
                SUM(requests_311_count)::int AS requests_311_count
         FROM mart_city_pulse_daily
         WHERE date >= $1::date AND date <= $2::date
         GROUP BY DATE_TRUNC('week', date)
         ORDER BY date DESC`,
        [dateRange.from, dateRange.to]
      );
    }
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

export async function getKpiTotalsPerDomain(
  tw: TimeWindow,
  domainFreshness: { crime: string | null; crashes: string | null; requests311: string | null }
): Promise<NeighborhoodTotalRow | null> {
  const days = daysForWindow(tw);
  const crimeMax = domainFreshness.crime;
  const crashesMax = domainFreshness.crashes;
  const r311Max = domainFreshness.requests311;
  if (!crimeMax && !crashesMax && !r311Max) return null;

  // Use per-domain max dates as upper bounds for current and previous period
  const rows = await query<NeighborhoodTotalRow>(
    `WITH
     crime_cur AS (
       SELECT COALESCE(SUM(crime_count), 0)::int AS v
       FROM mart_city_pulse_daily
       WHERE date > $2::date - $1::int AND date <= $2::date
     ),
     crime_prev AS (
       SELECT COALESCE(SUM(crime_count), 0)::int AS v
       FROM mart_city_pulse_daily
       WHERE date > $2::date - 2 * $1::int AND date <= $2::date - $1::int
     ),
     crashes_cur AS (
       SELECT COALESCE(SUM(crash_count), 0)::int AS v
       FROM mart_city_pulse_daily
       WHERE date > $3::date - $1::int AND date <= $3::date
     ),
     crashes_prev AS (
       SELECT COALESCE(SUM(crash_count), 0)::int AS v
       FROM mart_city_pulse_daily
       WHERE date > $3::date - 2 * $1::int AND date <= $3::date - $1::int
     ),
     r311_cur AS (
       SELECT COALESCE(SUM(requests_311_count), 0)::int AS v
       FROM mart_city_pulse_daily
       WHERE date > $4::date - $1::int AND date <= $4::date
     ),
     r311_prev AS (
       SELECT COALESCE(SUM(requests_311_count), 0)::int AS v
       FROM mart_city_pulse_daily
       WHERE date > $4::date - 2 * $1::int AND date <= $4::date - $1::int
     )
     SELECT
       crime_cur.v AS crime_count,
       crashes_cur.v AS crash_count,
       r311_cur.v AS requests_311_count,
       CASE WHEN crime_prev.v > 0
            THEN ROUND(((crime_cur.v - crime_prev.v)::numeric / crime_prev.v) * 100, 1)
            ELSE NULL END AS crime_delta_pct,
       CASE WHEN crashes_prev.v > 0
            THEN ROUND(((crashes_cur.v - crashes_prev.v)::numeric / crashes_prev.v) * 100, 1)
            ELSE NULL END AS crash_delta_pct,
       CASE WHEN r311_prev.v > 0
            THEN ROUND(((r311_cur.v - r311_prev.v)::numeric / r311_prev.v) * 100, 1)
            ELSE NULL END AS requests_311_delta_pct
     FROM crime_cur, crime_prev, crashes_cur, crashes_prev, r311_cur, r311_prev`,
    [days, crimeMax ?? '1970-01-01', crashesMax ?? '1970-01-01', r311Max ?? '1970-01-01']
  );
  return rows[0] ?? null;
}

export interface DomainFreshness {
  crime: string | null;
  crashes: string | null;
  requests311: string | null;
}

export async function getDomainFreshness(): Promise<DomainFreshness> {
  const rows = await query<{ domain: string; max_date: string }>(
    `SELECT domain, MAX(date)::text AS max_date
     FROM mart_incident_trends
     GROUP BY domain`
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.domain] = r.max_date;
  return {
    crime: map["crime"] ?? null,
    crashes: map["crashes"] ?? null,
    requests311: map["311"] ?? null,
  };
}

export async function getEffectiveThrough(_tw: TimeWindow): Promise<string | null> {
  const freshness = await getDomainFreshness();
  const dates = [freshness.crime, freshness.crashes, freshness.requests311].filter(Boolean) as string[];
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a < b ? a : b));
}

// --- Category Trends (sparklines per category) ---

interface CategoryTrendRow {
  domain: string;
  category: string;
  date: string;
  count: number;
}

export async function getCategoryTrends(
  tw: TimeWindow,
  neighborhood: string = "all"
): Promise<CategoryTrendRow[]> {
  const days = daysForWindow(tw);
  if (neighborhood === "all") {
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
  // For neighborhood: query staging tables, optional weekly aggregation for 90d
  if (days <= 30) {
    return query<CategoryTrendRow>(
      `WITH anchor AS (SELECT MAX(date) AS d FROM mart_city_pulse_daily)
       SELECT domain, category, date, count FROM (
         SELECT 'crime' AS domain,
                ${CRIME_LABEL_SQL} AS category,
                (reported_date AT TIME ZONE 'America/Denver')::date::text AS date,
                COUNT(*)::int AS count
         FROM stg_crime CROSS JOIN anchor
         WHERE neighborhood = $2
           AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
           AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
         GROUP BY (reported_date AT TIME ZONE 'America/Denver')::date, ${CRIME_LABEL_SQL}

         UNION ALL

         SELECT 'crashes' AS domain,
                ${CRASH_LABEL_SQL} AS category,
                (reported_date AT TIME ZONE 'America/Denver')::date::text AS date,
                COUNT(*)::int AS count
         FROM stg_crashes CROSS JOIN anchor
         WHERE neighborhood = $2
           AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
           AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
         GROUP BY (reported_date AT TIME ZONE 'America/Denver')::date, ${CRASH_LABEL_SQL}

         UNION ALL

         SELECT '311' AS domain,
                COALESCE(NULLIF(agency, ''), 'Other') AS category,
                (case_created_date AT TIME ZONE 'America/Denver')::date::text AS date,
                COUNT(*)::int AS count
         FROM stg_311 CROSS JOIN anchor
         WHERE neighborhood = $2
           AND case_created_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
           AND case_created_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
         GROUP BY (case_created_date AT TIME ZONE 'America/Denver')::date, agency
       ) t
       ORDER BY domain, category, date`,
      [days, neighborhood]
    );
  }
  // 90d + neighborhood: aggregate by week
  return query<CategoryTrendRow>(
    `WITH anchor AS (SELECT MAX(date) AS d FROM mart_city_pulse_daily),
     daily AS (
       SELECT 'crime' AS domain,
              ${CRIME_LABEL_SQL} AS category,
              (reported_date AT TIME ZONE 'America/Denver')::date AS date,
              COUNT(*)::int AS count
       FROM stg_crime CROSS JOIN anchor
       WHERE neighborhood = $2
         AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY (reported_date AT TIME ZONE 'America/Denver')::date, ${CRIME_LABEL_SQL}

       UNION ALL

       SELECT 'crashes' AS domain,
              ${CRASH_LABEL_SQL} AS category,
              (reported_date AT TIME ZONE 'America/Denver')::date AS date,
              COUNT(*)::int AS count
       FROM stg_crashes CROSS JOIN anchor
       WHERE neighborhood = $2
         AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY (reported_date AT TIME ZONE 'America/Denver')::date, ${CRASH_LABEL_SQL}

       UNION ALL

       SELECT '311' AS domain,
              COALESCE(NULLIF(agency, ''), 'Other') AS category,
              (case_created_date AT TIME ZONE 'America/Denver')::date AS date,
              COUNT(*)::int AS count
       FROM stg_311 CROSS JOIN anchor
       WHERE neighborhood = $2
         AND case_created_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND case_created_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY (case_created_date AT TIME ZONE 'America/Denver')::date, agency
     )
     SELECT domain, category,
            DATE_TRUNC('week', date)::date::text AS date,
            SUM(count)::int AS count
     FROM daily
     GROUP BY domain, category, DATE_TRUNC('week', date)
     ORDER BY domain, category, date`,
    [days, neighborhood]
  );
}

// --- Categories ---

interface CategoryRow {
  domain: string;
  category: string;
  count: number;
  pct_of_total: number;
}

export async function getCategories(tw: TimeWindow, neighborhood: string = "all"): Promise<CategoryRow[]> {
  if (neighborhood === "all") {
    return query<CategoryRow>(
      `SELECT domain, category, count, pct_of_total
       FROM mart_category_breakdown
       WHERE period = $1
       ORDER BY domain, count DESC`,
      [tw]
    );
  }
  const days = daysForWindow(tw);
  return query<CategoryRow>(
    `WITH anchor AS (SELECT MAX(date) AS d FROM mart_city_pulse_daily),
     raw AS (
       SELECT 'crime' AS domain,
              ${CRIME_LABEL_SQL} AS category,
              COUNT(*)::int AS count
       FROM stg_crime CROSS JOIN anchor
       WHERE neighborhood = $2
         AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY ${CRIME_LABEL_SQL}

       UNION ALL

       SELECT 'crashes' AS domain,
              ${CRASH_LABEL_SQL} AS category,
              COUNT(*)::int AS count
       FROM stg_crashes CROSS JOIN anchor
       WHERE neighborhood = $2
         AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY ${CRASH_LABEL_SQL}

       UNION ALL

       SELECT '311' AS domain,
              COALESCE(NULLIF(agency, ''), 'Other') AS category,
              COUNT(*)::int AS count
       FROM stg_311 CROSS JOIN anchor
       WHERE neighborhood = $2
         AND case_created_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND case_created_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY agency
     ),
     totals AS (
       SELECT domain, SUM(count) AS total FROM raw GROUP BY domain
     )
     SELECT raw.domain, raw.category, raw.count,
            ROUND(raw.count::numeric / NULLIF(totals.total, 0) * 100, 1) AS pct_of_total
     FROM raw JOIN totals ON raw.domain = totals.domain
     ORDER BY raw.domain, raw.count DESC`,
    [days, neighborhood]
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
  domain: string,
  neighborhood: string = "all"
): Promise<HeatmapRow[]> {
  if (neighborhood === "all") {
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
  // Neighborhood-specific: query staging tables directly
  const days = daysForWindow(tw);
  if (domain === "crime") {
    return query<HeatmapRow>(
      `WITH anchor AS (SELECT MAX(date) AS d FROM mart_city_pulse_daily)
       SELECT EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver')::smallint - 1 AS day_of_week,
              EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')::smallint AS hour_of_day,
              COUNT(*)::int AS count
       FROM stg_crime CROSS JOIN anchor
       WHERE neighborhood = $2
         AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver'),
                EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')
       ORDER BY day_of_week, hour_of_day`,
      [days, neighborhood]
    );
  }
  if (domain === "crashes") {
    return query<HeatmapRow>(
      `WITH anchor AS (SELECT MAX(date) AS d FROM mart_city_pulse_daily)
       SELECT EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver')::smallint - 1 AS day_of_week,
              EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')::smallint AS hour_of_day,
              COUNT(*)::int AS count
       FROM stg_crashes CROSS JOIN anchor
       WHERE neighborhood = $2
         AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver'),
                EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')
       ORDER BY day_of_week, hour_of_day`,
      [days, neighborhood]
    );
  }
  // domain === "all": union all three, then AVG across domains
  return query<HeatmapRow>(
    `WITH anchor AS (SELECT MAX(date) AS d FROM mart_city_pulse_daily),
     per_domain AS (
       SELECT EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver')::smallint - 1 AS day_of_week,
              EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')::smallint AS hour_of_day,
              COUNT(*)::int AS count
       FROM stg_crime CROSS JOIN anchor
       WHERE neighborhood = $2
         AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver'),
                EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')

       UNION ALL

       SELECT EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver')::smallint - 1,
              EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')::smallint,
              COUNT(*)::int
       FROM stg_crashes CROSS JOIN anchor
       WHERE neighborhood = $2
         AND reported_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND reported_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY EXTRACT(ISODOW FROM reported_date AT TIME ZONE 'America/Denver'),
                EXTRACT(HOUR FROM reported_date AT TIME ZONE 'America/Denver')

       UNION ALL

       SELECT EXTRACT(ISODOW FROM case_created_date AT TIME ZONE 'America/Denver')::smallint - 1,
              EXTRACT(HOUR FROM case_created_date AT TIME ZONE 'America/Denver')::smallint,
              COUNT(*)::int
       FROM stg_311 CROSS JOIN anchor
       WHERE neighborhood = $2
         AND case_created_date > (anchor.d - $1::int)::timestamp AT TIME ZONE 'America/Denver'
         AND case_created_date <= (anchor.d + 1)::timestamp AT TIME ZONE 'America/Denver'
       GROUP BY EXTRACT(ISODOW FROM case_created_date AT TIME ZONE 'America/Denver'),
                EXTRACT(HOUR FROM case_created_date AT TIME ZONE 'America/Denver')
     )
     SELECT day_of_week, hour_of_day, ROUND(AVG(count))::int AS count
     FROM per_domain
     GROUP BY day_of_week, hour_of_day
     ORDER BY day_of_week, hour_of_day`,
    [days, neighborhood]
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
