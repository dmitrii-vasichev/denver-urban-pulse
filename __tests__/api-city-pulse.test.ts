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
const { GET: getCategoryTrends } = require("@/app/api/city-pulse/category-trends/route");
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
      // getDomainFreshness query (called first)
      mockQuery.mockResolvedValueOnce([
        { domain: "crime", max_date: "2026-03-12" },
        { domain: "crashes", max_date: "2026-03-12" },
        { domain: "311", max_date: "2026-03-12" },
      ]);
      // sparkline query (now uses explicit date bounds)
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-12", crime_count: 10, crash_count: 5, requests_311_count: 20 },
        { date: "2026-03-11", crime_count: 8, crash_count: 3, requests_311_count: 15 },
      ]);
      // per-domain totals query
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

    it("returns per-domain freshness, dateRange, and effectiveThrough", async () => {
      // getDomainFreshness query — domains have different max dates
      mockQuery.mockResolvedValueOnce([
        { domain: "crime", max_date: "2026-03-09" },
        { domain: "crashes", max_date: "2026-03-09" },
        { domain: "311", max_date: "2026-03-14" },
      ]);
      // sparkline query (covers full range: Mar 3 – Mar 14)
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-03", crime_count: 5, crash_count: 2, requests_311_count: 0 },
        { date: "2026-03-08", crime_count: 3, crash_count: 1, requests_311_count: 10 },
        { date: "2026-03-09", crime_count: 4, crash_count: 2, requests_311_count: 12 },
        { date: "2026-03-14", crime_count: 0, crash_count: 0, requests_311_count: 15 },
      ]);
      // per-domain totals query
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
      // effectiveThrough = MIN of domain dates
      expect(body.effectiveThrough).toBe("2026-03-09");
      // per-domain freshness
      expect(body.domainFreshness.crime).toBe("2026-03-09");
      expect(body.domainFreshness.crashes).toBe("2026-03-09");
      expect(body.domainFreshness.requests311).toBe("2026-03-14");
      // per-domain date ranges
      expect(body.data.crime.dateRange).toEqual({ from: "2026-03-03", to: "2026-03-09" });
      expect(body.data.requests311.dateRange).toEqual({ from: "2026-03-08", to: "2026-03-14" });
      // crime sparkline should NOT include dates beyond crime's max (Mar 9)
      const crimeDates = body.data.crime.sparkline.map((p: { date: string }) => p.date);
      expect(crimeDates.every((d: string) => d <= "2026-03-09")).toBe(true);
      // 311 sparkline should include dates up to Mar 14
      const r311Dates = body.data.requests311.sparkline.map((p: { date: string }) => p.date);
      expect(r311Dates.some((d: string) => d > "2026-03-09")).toBe(true);
    });

    it("first query uses getDomainFreshness with MAX(date)", async () => {
      // getDomainFreshness
      mockQuery.mockResolvedValueOnce([
        { domain: "crime", max_date: "2026-03-01" },
        { domain: "crashes", max_date: "2026-03-01" },
        { domain: "311", max_date: "2026-03-01" },
      ]);
      // sparkline (with explicit date bounds)
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-01", crime_count: 5, crash_count: 2, requests_311_count: 10 },
      ]);
      // per-domain totals
      mockQuery.mockResolvedValueOnce([
        { crime_count: 50, crash_count: 20, requests_311_count: 100, crime_delta_pct: null, crash_delta_pct: null, requests_311_delta_pct: null },
      ]);

      await getKpis(makeRequest("http://localhost/api/city-pulse/kpis?timeWindow=7d"));

      // getDomainFreshness query (1st call) should use MAX(date)
      const freshSql = mockQuery.mock.calls[0][0] as string;
      expect(freshSql).toContain("MAX(date)");
      expect(freshSql).not.toContain("NOW()");

      // sparkline query (2nd call) uses explicit date bounds when all dates are equal
      const sparkSql = mockQuery.mock.calls[1][0] as string;
      expect(sparkSql).toContain("date");
      expect(sparkSql).not.toContain("NOW()");
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

    it("passes neighborhood param to query when provided", async () => {
      mockQuery.mockResolvedValueOnce([
        { domain: "crime", category: "Theft", count: 10, pct_of_total: 100.0 },
      ]);

      const res = await getCategories(
        makeRequest("http://localhost/api/city-pulse/categories?timeWindow=30d&neighborhood=Five%20Points")
      );
      expect(res.status).toBe(200);
      // Neighborhood query hits staging tables with neighborhood filter
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("neighborhood = $2");
      expect(mockQuery.mock.calls[0][1]).toContain("Five Points");
    });

    it("returns percent as number even when pg returns numeric as string (closes #220)", async () => {
      // PostgreSQL ROUND() returns numeric type, which pg driver serializes as string
      mockQuery.mockResolvedValueOnce([
        { domain: "crime", category: "Larceny", count: "118", pct_of_total: "44.2" },
        { domain: "crashes", category: "Hit & Run", count: "15", pct_of_total: "60.0" },
      ]);

      const res = await getCategories(
        makeRequest("http://localhost/api/city-pulse/categories?timeWindow=30d&neighborhood=Central%20Park")
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(typeof body.data.crime[0].percent).toBe("number");
      expect(body.data.crime[0].percent).toBe(44.2);
      expect(typeof body.data.crime[0].count).toBe("number");
      expect(body.data.crime[0].count).toBe(118);
      expect(typeof body.data.crashes[0].percent).toBe("number");
      expect(body.data.crashes[0].percent).toBe(60.0);
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

    it("passes neighborhood param to query when provided", async () => {
      mockQuery.mockResolvedValueOnce([
        { day_of_week: 0, hour_of_day: 12, count: 5 },
      ]);

      const res = await getHeatmap(
        makeRequest("http://localhost/api/city-pulse/heatmap?timeWindow=30d&domain=crime&neighborhood=Capitol%20Hill")
      );
      expect(res.status).toBe(200);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("neighborhood = $2");
      expect(mockQuery.mock.calls[0][1]).toContain("Capitol Hill");
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

  describe("GET /api/city-pulse/category-trends", () => {
    it("groups trend rows by domain and category", async () => {
      mockQuery.mockResolvedValueOnce([
        { domain: "crime", category: "Theft", date: "2026-03-10", count: 12 },
        { domain: "crime", category: "Theft", date: "2026-03-11", count: 15 },
        { domain: "crime", category: "Assault", date: "2026-03-10", count: 5 },
        { domain: "311", category: "Graffiti", date: "2026-03-10", count: 8 },
      ]);

      const res = await getCategoryTrends(
        makeRequest("http://localhost/api/city-pulse/category-trends?timeWindow=7d")
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.crime.Theft).toHaveLength(2);
      expect(body.data.crime.Theft[0]).toEqual({ date: "2026-03-10", value: 12 });
      expect(body.data.crime.Assault).toHaveLength(1);
      expect(body.data.requests311.Graffiti).toHaveLength(1);
    });

    it("passes neighborhood param to query when provided", async () => {
      mockQuery.mockResolvedValueOnce([
        { domain: "crime", category: "Theft", date: "2026-03-10", count: 3 },
      ]);

      const res = await getCategoryTrends(
        makeRequest("http://localhost/api/city-pulse/category-trends?timeWindow=7d&neighborhood=LoDo")
      );
      expect(res.status).toBe(200);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("neighborhood = $2");
      expect(mockQuery.mock.calls[0][1]).toContain("LoDo");
    });

    it("returns 500 on error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("DB connection failed"));

      const res = await getCategoryTrends(
        makeRequest("http://localhost/api/city-pulse/category-trends?timeWindow=30d")
      );
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("DB connection failed");
    });
  });

});
