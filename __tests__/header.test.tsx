import { render, screen, fireEvent } from "@testing-library/react";
import { TimeWindowFilter } from "@/components/layout/time-window-filter";
import { Header } from "@/components/layout/header";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock fetch for NeighborhoodFilter
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ data: [] }) })
  ) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("TimeWindowFilter", () => {
  it("renders three pill buttons", () => {
    const onChange = jest.fn();
    render(<TimeWindowFilter value="30d" onChange={onChange} />);

    expect(screen.getByText("7D")).toBeInTheDocument();
    expect(screen.getByText("30D")).toBeInTheDocument();
    expect(screen.getByText("90D")).toBeInTheDocument();
  });

  it("highlights active value", () => {
    const onChange = jest.fn();
    render(<TimeWindowFilter value="30d" onChange={onChange} />);

    const active = screen.getByText("30D");
    expect(active).toHaveClass("bg-[#102A43]");
    expect(active).toHaveClass("text-white");

    const inactive = screen.getByText("7D");
    expect(inactive).toHaveClass("bg-[#EEF4FA]");
  });

  it("calls onChange on click", () => {
    const onChange = jest.fn();
    render(<TimeWindowFilter value="30d" onChange={onChange} />);

    fireEvent.click(screen.getByText("7D"));
    expect(onChange).toHaveBeenCalledWith("7d");
  });
});

describe("Header freshness display", () => {
  it("shows pipeline ran and per-domain freshness dates", () => {
    render(
      <Header
        title="City Pulse"
        subtitle="Test"
        lastUpdated="2026-03-15T06:00:00.000Z"
        domainFreshness={{
          crime: "2026-03-09",
          crashes: "2026-03-09",
          requests311: "2026-03-14",
          aqi: "2026-03-16",
        }}
      />
    );

    expect(screen.getByText(/Pipeline ran:/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 15/)).toBeInTheDocument();
    expect(screen.getByText(/Data through:/)).toBeInTheDocument();
    expect(screen.getByText("Crime")).toBeInTheDocument();
    expect(screen.getByText("Crashes")).toBeInTheDocument();
    expect(screen.getByText("311")).toBeInTheDocument();
    expect(screen.getByText("AQI")).toBeInTheDocument();
    expect(screen.getByText(/Data through:/)).toBeInTheDocument();
  });

  it("hides freshness when props are null", () => {
    render(<Header title="City Pulse" />);
    expect(screen.queryByText(/Pipeline ran:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Data through:/)).not.toBeInTheDocument();
  });

  it("renders pipeline_behind tooltip content for stale pipeline source", () => {
    render(
      <Header
        title="City Pulse"
        lastUpdated="2026-04-05T06:00:00.000Z"
        domainFreshness={{
          crime: "2026-03-26",
          crashes: "2026-03-09",
          requests311: "2026-03-31",
          aqi: "2026-04-04",
        }}
        sourceFreshness={[
          {
            source: "crime",
            dbDate: "2026-03-26",
            sourceDate: "2026-04-02",
            driftDays: 7,
            sourceAgeDays: 3,
            status: "pipeline_behind",
            checkedAt: "2026-04-05T06:00:00.000Z",
          },
        ]}
      />
    );

    // Tooltip body is rendered in DOM (hidden via CSS group-hover, but JSDOM
    // still sees it). Check for pipeline_behind specific content.
    expect(screen.getByText(/Pipeline behind by 7 days/)).toBeInTheDocument();
  });

  it("renders source_lag tooltip content when source itself is delayed", () => {
    render(
      <Header
        title="City Pulse"
        lastUpdated="2026-04-05T06:00:00.000Z"
        domainFreshness={{
          crime: "2026-04-02",
          crashes: "2026-03-09",
          requests311: "2026-03-31",
          aqi: "2026-04-04",
        }}
        sourceFreshness={[
          {
            source: "crashes",
            dbDate: "2026-03-09",
            sourceDate: "2026-03-09",
            driftDays: 0,
            sourceAgeDays: 27,
            status: "source_lag",
            checkedAt: "2026-04-05T06:00:00.000Z",
          },
        ]}
      />
    );

    expect(screen.getByText(/Source publishes with 27d delay/)).toBeInTheDocument();
  });

  it("renders ok tooltip content when everything is caught up", () => {
    render(
      <Header
        title="City Pulse"
        lastUpdated="2026-04-05T06:00:00.000Z"
        domainFreshness={{
          crime: "2026-04-02",
          crashes: null,
          requests311: null,
          aqi: null,
        }}
        sourceFreshness={[
          {
            source: "crime",
            dbDate: "2026-04-02",
            sourceDate: "2026-04-02",
            driftDays: 0,
            sourceAgeDays: 3,
            status: "ok",
            checkedAt: "2026-04-05T06:00:00.000Z",
          },
        ]}
      />
    );

    expect(screen.getByText(/Up to date/)).toBeInTheDocument();
  });

  it("renders without tooltip when sourceFreshness is omitted", () => {
    render(
      <Header
        title="City Pulse"
        lastUpdated="2026-04-05T06:00:00.000Z"
        domainFreshness={{
          crime: "2026-04-02",
          crashes: null,
          requests311: null,
          aqi: null,
        }}
      />
    );

    // Only the date itself is visible — no status strings
    expect(screen.queryByText(/Up to date/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pipeline behind/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Source publishes with/)).not.toBeInTheDocument();
  });
});
