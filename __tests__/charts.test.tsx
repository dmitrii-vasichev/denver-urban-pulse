import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryChart } from "@/components/charts/category-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { Sparkline } from "@/components/ui/sparkline";
import type { CategoryBreakdown, CategoryTrends, HeatmapCell } from "@/lib/types";

// Mock recharts to avoid canvas issues in jsdom
jest.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div />,
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
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

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

  it("shows tooltip with sparkline on hover", () => {
    const trends: CategoryTrends = {
      crime: {
        Theft: [
          { date: "2026-03-10", value: 12 },
          { date: "2026-03-11", value: 15 },
        ],
      },
    };
    render(<CategoryChart data={sampleCategories} trends={trends} />);

    // Hover over the Theft bar row
    const theftLabel = screen.getByText("Theft");
    const barRow = theftLabel.closest("[class*='flex']")!;
    fireEvent.mouseEnter(barRow);

    // Tooltip should render — check for the tooltip container
    const tooltipContainer = document.querySelector(".animate-fade-in");
    expect(tooltipContainer).toBeInTheDocument();

    // Tooltip should contain category name, count, and percent
    expect(tooltipContainer!.textContent).toContain("Theft");
    expect(tooltipContainer!.textContent).toContain("500");
    expect(tooltipContainer!.textContent).toContain("40.0%");

    // Sparkline should render (mocked as area-chart)
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();

    // Mouse leave hides tooltip
    fireEvent.mouseLeave(barRow);
    expect(document.querySelector(".animate-fade-in")).not.toBeInTheDocument();
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

describe("Sparkline regression: numeric width bypasses ResponsiveContainer", () => {
  const trendData = [
    { date: "2026-03-10", value: 10 },
    { date: "2026-03-11", value: 20 },
  ];

  it("renders AreaChart directly when width is a number (tooltip context)", () => {
    const { container } = render(
      <Sparkline data={trendData} color="#2458C6" width={176} height={40} interactive={false} />
    );
    // AreaChart should render (mocked as area-chart testid)
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    // Should NOT have ResponsiveContainer wrapper (no extra nesting)
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("176px");
  });

  it("uses ResponsiveContainer when width is a string", () => {
    render(
      <Sparkline data={trendData} color="#2458C6" width="100%" height={40} interactive={false} />
    );
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
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

