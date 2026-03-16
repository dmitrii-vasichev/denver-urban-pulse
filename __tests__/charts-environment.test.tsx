import { render, screen } from "@testing-library/react";
import { AqiTrendChart, evenlySpacedTicks } from "@/components/charts/aqi-trend-chart";
import { ChangeLeadersChart, computeLeaders } from "@/components/charts/change-leaders-chart";
import type { AqiDailyPoint, ComparisonRow } from "@/lib/types";

// Mock recharts to avoid canvas issues in jsdom
jest.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div />,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Cell: () => <div />,
  ReferenceArea: () => <div />,
  ReferenceLine: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const sampleAqi: AqiDailyPoint[] = [
  { date: "2026-03-01", aqiMax: 42, aqiOzone: 38, aqiPm25: 42, aqiPm10: 15, category: "Good" },
  { date: "2026-03-02", aqiMax: 65, aqiOzone: 50, aqiPm25: 65, aqiPm10: 20, category: "Moderate" },
  { date: "2026-03-03", aqiMax: 110, aqiOzone: 80, aqiPm25: 110, aqiPm10: 30, category: "USG" },
];

describe("AqiTrendChart", () => {
  it("renders with sample data", () => {
    const { container } = render(<AqiTrendChart data={sampleAqi} />);
    expect(container.querySelector("[data-testid='area-chart']")).toBeInTheDocument();
  });

  it("shows empty message for no data", () => {
    render(<AqiTrendChart data={[]} />);
    expect(screen.getByText("No AQI data available")).toBeInTheDocument();
  });

  describe("evenlySpacedTicks", () => {
    it("returns all dates when data fits within maxTicks", () => {
      const ticks = evenlySpacedTicks(sampleAqi, 5);
      expect(ticks).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"]);
    });

    it("returns evenly spaced ticks for 30-day dataset", () => {
      const data: AqiDailyPoint[] = [];
      const start = new Date("2026-02-14");
      for (let i = 0; i < 30; i++) {
        const dt = new Date(start);
        dt.setDate(start.getDate() + i);
        const iso = dt.toISOString().slice(0, 10);
        data.push({ date: iso, aqiMax: 40, aqiOzone: 30, aqiPm25: 40, aqiPm10: 10, category: "Good" });
      }

      const ticks = evenlySpacedTicks(data, 5);
      expect(ticks).toHaveLength(5);
      expect(ticks[0]).toBe("2026-02-14");
      expect(ticks[4]).toBe(data[data.length - 1].date);

      // Verify even spacing: intervals between consecutive ticks should be equal
      const indices = ticks.map((t) => data.findIndex((d) => d.date === t));
      const gaps = indices.slice(1).map((idx, i) => idx - indices[i]);
      const allEqual = gaps.every((g) => Math.abs(g - gaps[0]) <= 1);
      expect(allEqual).toBe(true);
    });
  });
});

const sampleComparison: ComparisonRow[] = [
  { neighborhood: "Five Points", crimeRate: 12.5, crashRate: 3.2, requests311Rate: 8.1, crimeDeltaPct: 5.0, crashDeltaPct: -2.0, requests311DeltaPct: 1.0 },
  { neighborhood: "Capitol Hill", crimeRate: 10.0, crashRate: 4.5, requests311Rate: 6.0, crimeDeltaPct: -3.0, crashDeltaPct: -1.0, requests311DeltaPct: -2.0 },
  { neighborhood: "CBD", crimeRate: 15.0, crashRate: 5.0, requests311Rate: 10.0, crimeDeltaPct: 8.0, crashDeltaPct: 3.0, requests311DeltaPct: 5.0 },
  { neighborhood: "Baker", crimeRate: 8.0, crashRate: 2.0, requests311Rate: 5.0, crimeDeltaPct: -5.0, crashDeltaPct: -4.0, requests311DeltaPct: -6.0 },
  { neighborhood: "RiNo", crimeRate: 11.0, crashRate: 3.5, requests311Rate: 7.0, crimeDeltaPct: 2.0, crashDeltaPct: 1.0, requests311DeltaPct: 3.0 },
  { neighborhood: "Highlands", crimeRate: 7.0, crashRate: 2.5, requests311Rate: 4.0, crimeDeltaPct: -1.0, crashDeltaPct: -2.5, requests311DeltaPct: -1.5 },
  { neighborhood: "LoDo", crimeRate: 14.0, crashRate: 6.0, requests311Rate: 9.0, crimeDeltaPct: 10.0, crashDeltaPct: 4.0, requests311DeltaPct: 7.0 },
  { neighborhood: "Montbello", crimeRate: 9.0, crashRate: 3.0, requests311Rate: 6.5, crimeDeltaPct: -6.0, crashDeltaPct: -3.0, requests311DeltaPct: -4.0 },
  { neighborhood: "Cherry Creek", crimeRate: 6.0, crashRate: 1.5, requests311Rate: 3.0, crimeDeltaPct: 0.5, crashDeltaPct: 0.0, requests311DeltaPct: 0.5 },
  { neighborhood: "Stapleton", crimeRate: 5.0, crashRate: 1.0, requests311Rate: 2.5, crimeDeltaPct: -0.5, crashDeltaPct: -0.5, requests311DeltaPct: -1.0 },
];

describe("ChangeLeadersChart", () => {
  it("renders with sample data", () => {
    const { container } = render(<ChangeLeadersChart data={sampleComparison} />);
    expect(container.querySelector("[data-testid='bar-chart']")).toBeInTheDocument();
  });

  it("shows empty message for no data", () => {
    render(<ChangeLeadersChart data={[]} />);
    expect(screen.getByText("No change data available")).toBeInTheDocument();
  });

  it("marks the most improved neighborhood", () => {
    const leaders = computeLeaders(sampleComparison);
    const mostImproved = leaders.filter((l) => l.isMostImproved);
    expect(mostImproved).toHaveLength(1);
    // Baker has the lowest avg delta: (-5 + -4 + -6) / 3 = -5.0
    expect(mostImproved[0].neighborhood).toBe("Baker");
  });
});
