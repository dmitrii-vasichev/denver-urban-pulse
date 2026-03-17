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
});
