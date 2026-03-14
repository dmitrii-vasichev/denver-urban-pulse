// Mock next/server before importing routes
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      json: async () => body,
      headers: new Map(Object.entries(init?.headers ?? {})),
    }),
  },
}));

// Mock the db module
jest.mock("@/lib/db", () => ({
  query: jest.fn(),
  healthCheck: jest.fn(),
}));

import { query, healthCheck } from "@/lib/db";
import { GET as getNeighborhoods } from "@/app/api/shared/neighborhoods/route";
import { GET as getHealth } from "@/app/api/shared/health/route";

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockHealthCheck = healthCheck as jest.MockedFunction<typeof healthCheck>;

describe("GET /api/shared/neighborhoods", () => {
  it("returns sorted neighborhood list", async () => {
    mockQuery.mockResolvedValueOnce([
      { nbhd_name: "Capitol Hill" },
      { nbhd_name: "Five Points" },
      { nbhd_name: "LoDo" },
    ]);

    const response = await getNeighborhoods();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      { name: "Capitol Hill" },
      { name: "Five Points" },
      { name: "LoDo" },
    ]);
    expect(body.lastUpdated).toBeTruthy();
  });

  it("returns 500 on database error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Connection refused"));

    const response = await getNeighborhoods();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Connection refused");
    expect(body.data).toEqual([]);
  });
});

describe("GET /api/shared/health", () => {
  it("returns health status with source timestamps", async () => {
    mockHealthCheck.mockResolvedValueOnce(true);
    mockQuery.mockResolvedValueOnce([
      { source: "crime", last_update: "2026-03-13T06:00:00Z" },
      { source: "crashes", last_update: "2026-03-13T06:01:00Z" },
      { source: "311", last_update: "2026-03-13T06:02:00Z" },
      { source: "aqi", last_update: "2026-03-13T06:03:00Z" },
    ]);

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.sources.crime).toBe("2026-03-13T06:00:00Z");
    expect(body.sources.aqi).toBe("2026-03-13T06:03:00Z");
    expect(body.lastUpdated).toBe("2026-03-13T06:03:00Z");
  });

  it("returns 500 on error", async () => {
    mockHealthCheck.mockRejectedValueOnce(new Error("DB down"));

    const response = await getHealth();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);
  });
});
