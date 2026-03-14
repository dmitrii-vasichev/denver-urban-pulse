import { query } from "@/lib/db";

interface NeighborhoodRow {
  nbhd_name: string;
}

export async function getNeighborhoods(): Promise<string[]> {
  const rows = await query<NeighborhoodRow>(
    "SELECT nbhd_name FROM stg_neighborhoods ORDER BY nbhd_name"
  );
  return rows.map((r) => r.nbhd_name);
}

interface UpdateTimestamp {
  source: string;
  last_update: string | null;
}

export async function getSourceTimestamps(): Promise<
  Record<string, string | null>
> {
  const rows = await query<UpdateTimestamp>(`
    SELECT 'crime' AS source, MAX(updated_at)::text AS last_update
      FROM mart_city_pulse_daily WHERE crime_count > 0
    UNION ALL
    SELECT 'crashes', MAX(updated_at)::text
      FROM mart_city_pulse_daily WHERE crash_count > 0
    UNION ALL
    SELECT '311', MAX(updated_at)::text
      FROM mart_city_pulse_daily WHERE requests_311_count > 0
    UNION ALL
    SELECT 'aqi', MAX(updated_at)::text
      FROM mart_aqi_daily
  `);

  const result: Record<string, string | null> = {};
  for (const row of rows) {
    result[row.source] = row.last_update;
  }
  return result;
}
