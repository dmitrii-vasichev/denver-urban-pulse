jest.mock("next/server", () => {
  return {
    NextRequest: class {
      nextUrl: URL;
      constructor(url: string) {
        this.nextUrl = new URL(url);
      }
    },
    NextResponse: {
      json: (
        body: unknown,
        init?: { status?: number; headers?: Record<string, string> }
      ) => ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
    },
  };
});

jest.mock("@/lib/db", () => ({
  query: jest.fn(),
  healthCheck: jest.fn(),
}));

import { query } from "@/lib/db";
const mockQuery = query as jest.MockedFunction<typeof query>;

// We need to import routes after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getKpis } = require("@/app/api/city-pulse/kpis/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getTrends } = require("@/app/api/city-pulse/trends/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getCategories } = require("@/app/api/city-pulse/categories/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getHeatmap } = require("@/app/api/city-pulse/heatmap/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getNeighborhoods } = require("@/app/api/city-pulse/neighborhoods/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getNarrative } = require("@/app/api/city-pulse/narrative/route");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextRequest } = require("next/server");

function makeRequest(url: string) {
  return new NextRequest(url);
}

describe("City Pulse API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/city-pulse/kpis", () => {
    it("returns KPI data with correct shape", async () => {
      // sparkline query
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-12", crime_count: 10, crash_count: 5, requests_311_count: 20 },
        { date: "2026-03-11", crime_count: 8, crash_count: 3, requests_311_count: 15 },
      ]);
      // totals query
      mockQuery.mockResolvedValueOnce([
        {
          crime_count: 300,
          crash_count: 100,
          requests_311_count: 500,
          crime_delta_pct: 5.2,
          crash_delta_pct: -3.1,
          requests_311_delta_pct: 12.0,
        },
      ]);

      const res = await getKpis(makeRequest("http://localhost/api/city-pulse/kpis?timeWindow=30d"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.crime.value).toBe(300);
      expect(body.data.crime.deltaPercent).toBe(5.2);
      expect(body.data.crashes.value).toBe(100);
      expect(body.data.requests311.value).toBe(500);
      expect(body.data.crime.sparkline).toHaveLength(2);
    });
  });

  describe("GET /api/city-pulse/trends", () => {
    it("returns pivoted trend series", async () => {
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-11", domain: "crime", count: 10 },
        { date: "2026-03-11", domain: "crashes", count: 5 },
        { date: "2026-03-11", domain: "311", count: 20 },
        { date: "2026-03-12", domain: "crime", count: 12 },
      ]);

      const res = await getTrends(makeRequest("http://localhost/api/city-pulse/trends"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.series).toHaveLength(2);
      expect(body.data.series[0]).toEqual({
        date: "2026-03-11",
        crime: 10,
        crashes: 5,
        requests311: 20,
      });
    });
  });

  describe("GET /api/city-pulse/categories", () => {
    it("groups by domain", async () => {
      mockQuery.mockResolvedValueOnce([
        { domain: "crime", category: "Theft", count: 50, pct_of_total: 25.0 },
        { domain: "311", category: "Trash", count: 30, pct_of_total: 15.0 },
      ]);

      const res = await getCategories(makeRequest("http://localhost/api/city-pulse/categories"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.crime).toHaveLength(1);
      expect(body.data.requests311).toHaveLength(1);
      expect(body.data.crime[0].category).toBe("Theft");
    });
  });

  describe("GET /api/city-pulse/heatmap", () => {
    it("returns heatmap cells", async () => {
      mockQuery.mockResolvedValueOnce([
        { day_of_week: 0, hour_of_day: 12, count: 45 },
      ]);

      const res = await getHeatmap(makeRequest("http://localhost/api/city-pulse/heatmap"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data[0]).toEqual({ dayOfWeek: 0, hourOfDay: 12, count: 45 });
    });
  });

  describe("GET /api/city-pulse/neighborhoods", () => {
    it("returns neighborhood breakdown", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          neighborhood: "Five Points",
          crime_count: 80,
          crash_count: 20,
          requests_311_count: 100,
          total_delta_pct: 5.5,
        },
      ]);

      const res = await getNeighborhoods(makeRequest("http://localhost/api/city-pulse/neighborhoods"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data[0].neighborhood).toBe("Five Points");
      expect(body.data[0].crimeCount).toBe(80);
    });
  });

  describe("GET /api/city-pulse/narrative", () => {
    it("assembles narrative from signals", async () => {
      mockQuery.mockResolvedValueOnce([
        { signal_type: "top_domain", signal_key: "crime", signal_value: "Crime", signal_numeric: 1200 },
        { signal_type: "top_neighborhood", signal_key: "Capitol Hill", signal_value: null, signal_numeric: 150 },
      ]);

      const res = await getNarrative(makeRequest("http://localhost/api/city-pulse/narrative"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.title).toBe("City Pulse Today");
      expect(body.data.content).toContain("Crime");
      expect(body.data.content).toContain("Capitol Hill");
      expect(body.data.stats).toHaveLength(2);
    });
  });
});
