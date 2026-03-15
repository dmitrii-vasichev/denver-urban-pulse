import { render, screen } from "@testing-library/react";
import { TrendChart } from "@/components/charts/trend-chart";
import { CategoryChart } from "@/components/charts/category-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { NeighborhoodRankingChart } from "@/components/charts/neighborhood-ranking-chart";
import type { TrendPoint, CategoryBreakdown, HeatmapCell, NeighborhoodRow } from "@/lib/types";

// Mock recharts to avoid canvas issues in jsdom
jest.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div />,
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
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const sampleTrends: TrendPoint[] = [
  { date: "2026-03-01", crime: 120, crashes: 30, requests311: 200 },
  { date: "2026-03-02", crime: 115, crashes: 28, requests311: 190 },
  { date: "2026-03-03", crime: 130, crashes: 35, requests311: 210 },
];

describe("TrendChart", () => {
  it("renders with sample data", () => {
    const { container } = render(<TrendChart data={sampleTrends} />);
    expect(container.querySelector("[data-testid='line-chart']")).toBeInTheDocument();
  });

  it("shows empty message for no data", () => {
    render(<TrendChart data={[]} />);
    expect(screen.getByText("No trend data available")).toBeInTheDocument();
  });
});

const sampleCategories: Record<string, CategoryBreakdown[]> = {
  crime: [
    { category: "Theft", count: 500, percent: 40 },
    { category: "Assault", count: 300, percent: 24 },
  ],
  crashes: [
    { category: "Rear-end", count: 200, percent: 50 },
  ],
  requests311: [
    { category: "Graffiti", count: 150, percent: 30 },
  ],
};

describe("CategoryChart", () => {
  it("renders with sample data", () => {
    render(<CategoryChart data={sampleCategories} />);
    expect(screen.getByText("Crime")).toBeInTheDocument();
    expect(screen.getByText("Theft")).toBeInTheDocument();
  });

  it("shows empty message for no data", () => {
    render(<CategoryChart data={{}} />);
    expect(screen.getByText("No category data available")).toBeInTheDocument();
  });

  it("shows summary line for single-category domain", () => {
    const singleCategory: Record<string, CategoryBreakdown[]> = {
      crime: [{ category: "Larceny", count: 500, percent: 100 }],
      crashes: [],
      requests311: [],
    };
    render(<CategoryChart data={singleCategory} />);
    expect(screen.getByText("Crime")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    // Should not render bar for single-category domain
    expect(screen.queryByText("Larceny")).not.toBeInTheDocument();
  });
});

const sampleHeatmap: HeatmapCell[] = [
  { dayOfWeek: 0, hourOfDay: 12, count: 50 },
  { dayOfWeek: 1, hourOfDay: 18, count: 80 },
  { dayOfWeek: 6, hourOfDay: 23, count: 20 },
];

describe("HeatmapChart", () => {
  it("renders grid with data", () => {
    const { container } = render(<HeatmapChart data={sampleHeatmap} />);
    // Should render day labels
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    // Should render hour labels
    expect(screen.getByText("0:00")).toBeInTheDocument();
    // Grid cells should exist
    const cells = container.querySelectorAll("[data-cell]");
    expect(cells.length).toBe(7 * 24);
  });

  it("shows empty message for no data", () => {
    render(<HeatmapChart data={[]} />);
    expect(screen.getByText("No heatmap data available")).toBeInTheDocument();
  });
});

const sampleRanking: NeighborhoodRow[] = [
  { neighborhood: "Five Points", crimeCount: 200, crashCount: 50, requests311Count: 100, totalDeltaPct: 5.2 },
  { neighborhood: "Capitol Hill", crimeCount: 180, crashCount: 60, requests311Count: 90, totalDeltaPct: -3.1 },
  { neighborhood: "CBD", crimeCount: 150, crashCount: 40, requests311Count: 120, totalDeltaPct: 1.5 },
];

describe("NeighborhoodRankingChart", () => {
  it("renders with sample data", () => {
    const { container } = render(<NeighborhoodRankingChart data={sampleRanking} />);
    expect(container.querySelector("[data-testid='bar-chart']")).toBeInTheDocument();
  });

  it("shows empty message for no data", () => {
    render(<NeighborhoodRankingChart data={[]} />);
    expect(screen.getByText("No neighborhood data available")).toBeInTheDocument();
  });
});
