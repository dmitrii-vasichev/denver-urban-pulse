/**
 * @jest-environment node
 */
import pool, { healthCheck, query } from "@/lib/db";

afterAll(async () => {
  await pool.end();
});

describe("Database connection", () => {
  it("passes health check", async () => {
    const ok = await healthCheck();
    expect(ok).toBe(true);
  });

  it("can execute a simple query", async () => {
    const rows = await query<{ result: number }>("SELECT 1 + 1 AS result");
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toBe(2);
  });
});
