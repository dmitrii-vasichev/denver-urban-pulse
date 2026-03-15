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
  it("shows pipeline ran and data through dates", () => {
    render(
      <Header
        title="City Pulse"
        subtitle="Test"
        lastUpdated="2026-03-15T06:00:00.000Z"
        effectiveThrough="2026-03-09"
      />
    );

    expect(screen.getByText(/Pipeline ran:/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 15/)).toBeInTheDocument();
    expect(screen.getByText(/Data complete through:/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 9/)).toBeInTheDocument();
  });

  it("hides freshness when props are null", () => {
    render(<Header title="City Pulse" />);
    expect(screen.queryByText(/Pipeline ran:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Data complete through:/)).not.toBeInTheDocument();
  });
});
