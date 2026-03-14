import { render, screen } from "@testing-library/react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ChartCard } from "@/components/cards/chart-card";
import { NarrativeBlock } from "@/components/cards/narrative-block";

// Mock recharts to avoid canvas issues in jsdom
jest.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("KpiCard", () => {
  it("renders with value and title", () => {
    render(
      <KpiCard
        title="Crime"
        value={1234}
        color="#2458C6"
        deltaPercent={5.2}
      />
    );
    expect(screen.getByText("Crime")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("+5.2%")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    const { container } = render(
      <KpiCard title="Crime" value={0} color="#2458C6" loading={true} />
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("ChartCard", () => {
  it("renders title and children", () => {
    render(
      <ChartCard title="Incident Trends">
        <div data-testid="chart-content">Chart here</div>
      </ChartCard>
    );
    expect(screen.getByText("Incident Trends")).toBeInTheDocument();
    expect(screen.getByTestId("chart-content")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    const { container } = render(
      <ChartCard title="Trends" loading={true}>
        <div />
      </ChartCard>
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("NarrativeBlock", () => {
  it("renders dark panel with content and stats", () => {
    render(
      <NarrativeBlock
        title="City Pulse Today"
        content="Crime leads incident volume."
        stats={[{ label: "crime", value: "1,200" }]}
      />
    );
    expect(screen.getByText("City Pulse Today")).toBeInTheDocument();
    expect(screen.getByText("Crime leads incident volume.")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    const { container } = render(
      <NarrativeBlock title="" content="" loading={true} />
    );
    // Dark bg skeletons use bg-white/10
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
