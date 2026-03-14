import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function query<T extends object>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function healthCheck(): Promise<boolean> {
  try {
    const [row] = await query<{ now: Date }>("SELECT NOW()");
    return !!row?.now;
  } catch {
    return false;
  }
}

export default pool;
