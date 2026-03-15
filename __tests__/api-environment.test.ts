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
const { GET: getRankings } = require("@/app/api/environment/rankings/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getComparison } = require("@/app/api/environment/comparison/route");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET: getNarrative } = require("@/app/api/environment/narrative/route");
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
      expect(body.data.effectiveThrough).toBe("2026-03-13");
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
      expect(body.data.effectiveThrough).toBe("2026-03-13");
      expect(body.data.trend).toHaveLength(2);
      expect(body.data.trend.map((t: { date: string }) => t.date)).toEqual(["2026-03-12", "2026-03-13"]);
    });
  });

  describe("GET /api/environment/rankings", () => {
    it("returns neighborhood rankings", async () => {
      mockQuery.mockResolvedValueOnce([
        { neighborhood: "Five Points", crime_count: 80, crash_count: 20, requests_311_count: 100, composite_score: 95.5, rank: 1 },
      ]);

      const res = await getRankings(req("http://localhost/api/environment/rankings"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data[0].neighborhood).toBe("Five Points");
      expect(body.data[0].rank).toBe(1);
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

  describe("GET /api/environment/narrative", () => {
    it("assembles environment narrative", async () => {
      mockQuery.mockResolvedValueOnce([
        { signal_type: "aqi_status", signal_key: "current", signal_value: "Good", signal_numeric: 42 },
      ]);

      const res = await getNarrative(req("http://localhost/api/environment/narrative"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.title).toBe("Environment Today");
      expect(body.data.content).toContain("Good");
      expect(body.data.stats[0].value).toBe("42");
    });
  });
});
