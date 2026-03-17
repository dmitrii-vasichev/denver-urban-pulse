jest.mock("next/server", () => ({
  NextRequest: class {
    nextUrl: URL;
    constructor(url: string) {
      this.nextUrl = new URL(url);
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock("@/lib/db", () => ({
  query: jest.fn(),
}));

import { query } from "@/lib/db";
const mockQuery = query as jest.MockedFunction<typeof query>;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getAqi } = require("@/app/api/environment/aqi/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getComparison } = require("@/app/api/environment/comparison/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NextRequest } = require("next/server");

function req(url: string) {
  return new NextRequest(url);
}

describe("Environment API", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("GET /api/environment/aqi", () => {
    it("returns current AQI and trend", async () => {
      // current
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-13", aqi_max: 42, aqi_ozone: 38, aqi_pm25: 42, aqi_pm10: 20, category: "Good" },
      ]);
      // trend
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-12", aqi_max: 55, aqi_ozone: 50, aqi_pm25: 55, aqi_pm10: 30, category: "Moderate" },
        { date: "2026-03-13", aqi_max: 42, aqi_ozone: 38, aqi_pm25: 42, aqi_pm10: 20, category: "Good" },
      ]);
      // effectiveThrough
      mockQuery.mockResolvedValueOnce([{ effective_through: "2026-03-13" }]);

      const res = await getAqi(req("http://localhost/api/environment/aqi"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.current).toEqual({ aqi: 42, category: "Good" });
      expect(body.data.trend).toHaveLength(2);
      expect(body.effectiveThrough).toBe("2026-03-13");
    });

    it("returns effectiveThrough and filters trend data", async () => {
      // current
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-14", aqi_max: 50, aqi_ozone: 40, aqi_pm25: 50, aqi_pm10: 25, category: "Good" },
      ]);
      // trend — includes a date beyond effectiveThrough
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-12", aqi_max: 55, aqi_ozone: 50, aqi_pm25: 55, aqi_pm10: 30, category: "Moderate" },
        { date: "2026-03-13", aqi_max: 42, aqi_ozone: 38, aqi_pm25: 42, aqi_pm10: 20, category: "Good" },
        { date: "2026-03-14", aqi_max: 50, aqi_ozone: 40, aqi_pm25: 50, aqi_pm10: 25, category: "Good" },
      ]);
      // effectiveThrough — only up to 03-13
      mockQuery.mockResolvedValueOnce([{ effective_through: "2026-03-13" }]);

      const res = await getAqi(req("http://localhost/api/environment/aqi"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.effectiveThrough).toBe("2026-03-13");
      expect(body.data.trend).toHaveLength(2);
      expect(body.data.trend.map((t: { date: string }) => t.date)).toEqual(["2026-03-12", "2026-03-13"]);
    });

    it("anchors date range to MAX(date) instead of CURRENT_DATE", async () => {
      // current
      mockQuery.mockResolvedValueOnce([
        { date: "2026-03-01", aqi_max: 40, aqi_ozone: 35, aqi_pm25: 40, aqi_pm10: 20, category: "Good" },
      ]);
      // trend
      mockQuery.mockResolvedValueOnce([
        { date: "2026-02-26", aqi_max: 55, aqi_ozone: 50, aqi_pm25: 55, aqi_pm10: 30, category: "Moderate" },
        { date: "2026-03-01", aqi_max: 40, aqi_ozone: 35, aqi_pm25: 40, aqi_pm10: 20, category: "Good" },
      ]);
      // effectiveThrough
      mockQuery.mockResolvedValueOnce([{ effective_through: "2026-03-01" }]);

      await getAqi(req("http://localhost/api/environment/aqi?timeWindow=7d"));

      // Trend query (2nd call) should use MAX(date) not CURRENT_DATE
      const trendSql = mockQuery.mock.calls[1][0] as string;
      expect(trendSql).toContain("MAX(date)");
      expect(trendSql).not.toContain("CURRENT_DATE");

      // EffectiveThrough query (3rd call) should also use MAX(date)
      const etSql = mockQuery.mock.calls[2][0] as string;
      expect(etSql).toContain("MAX(date)");
      expect(etSql).not.toContain("CURRENT_DATE");
    });
  });

  describe("GET /api/environment/comparison", () => {
    it("returns comparison with neighborhood filter", async () => {
      mockQuery.mockResolvedValueOnce([
        { neighborhood: "Capitol Hill", crime_rate: 5.2, crash_rate: 1.1, requests_311_rate: 8.3, crime_delta_pct: 3.0, crash_delta_pct: -1.0, requests_311_delta_pct: 5.0 },
      ]);

      const res = await getComparison(req("http://localhost/api/environment/comparison?neighborhoods=Capitol+Hill"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data[0].neighborhood).toBe("Capitol Hill");
      expect(body.data[0].crimeRate).toBe(5.2);
    });
  });

});
