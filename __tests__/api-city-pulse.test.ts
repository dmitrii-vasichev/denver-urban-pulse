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
const { GET: getCategories } = require("@/app/api/city-pulse/categories/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getHeatmap } = require("@/app/api/city-pulse/heatmap/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getNeighborhoods } = require("@/app/api/city-pulse/neighborhoods/route");
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
      // effectiveThrough query (called first)
      mockQuery.mockResolvedValueOnce([{ effective_through: "2026-03-12" }]);
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
      expect(body.effectiveThrough).toBe("2026-03-12");
    });

    it("returns effectiveThrough in response", async () => {
      // effectiveThrough query (called first)
      mockQuery.mockResolvedValueOnce([{ effective_through: "2026-03-10" }]);
      // sparkline query
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-10", crime_count: 5, crash_count: 2, requests_311_count: 10 },
      ]);
      // totals query
      mockQuery.mockResolvedValueOnce([
        {
          crime_count: 150,
          crash_count: 50,
          requests_311_count: 200,
          crime_delta_pct: null,
          crash_delta_pct: null,
          requests_311_delta_pct: null,
        },
      ]);

      const res = await getKpis(makeRequest("http://localhost/api/city-pulse/kpis?timeWindow=7d"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.effectiveThrough).toBe("2026-03-10");
      expect(body.data).toBeDefined();
      expect(body.lastUpdated).toBeDefined();
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

});
