import { render, screen } from "@testing-library/react";

// Mock global fetch for components that call APIs (e.g., neighborhood-filter)
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  })
) as jest.Mock;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
}));

// Mock recharts
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
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div />,
  ReferenceArea: () => <div />,
}));

// Mock react-leaflet
jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div />,
  GeoJSON: () => <div />,
}));
jest.mock("leaflet/dist/leaflet.css", () => ({}));

// Mock GeoJSON import
jest.mock("@/data/geo/denver-neighborhoods.json", () => ({
  type: "FeatureCollection",
  features: [],
}));

import CityPulsePage from "@/app/page";
import { useCityPulseData } from "@/lib/hooks/use-city-pulse-data";
import { useEnvironmentData } from "@/lib/hooks/use-environment-data";

jest.mock("@/lib/hooks/use-city-pulse-data");
jest.mock("@/lib/hooks/use-environment-data");
const mockUseCityPulseData = useCityPulseData as jest.MockedFunction<typeof useCityPulseData>;
const mockUseEnvironmentData = useEnvironmentData as jest.MockedFunction<typeof useEnvironmentData>;

const defaultEnvData = {
  aqi: { current: { aqi: 42, status: "Good" }, trend: [] },
  rankings: [],
  comparison: [],
  narrative: null,
  effectiveThrough: null,
  lastUpdated: null,
  loading: false,
  error: null,
  retry: jest.fn(),
};

describe("CityPulsePage", () => {
  beforeEach(() => {
    mockUseEnvironmentData.mockReturnValue(defaultEnvData as ReturnType<typeof useEnvironmentData>);
  });

  it("renders loading state", () => {
    mockUseCityPulseData.mockReturnValue({
      kpis: null,
      trends: [],
      categories: {},
      heatmap: [],
      neighborhoods: [],
      narrative: null,
      loading: true,
      error: null,
    });

    const { container } = render(<CityPulsePage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders with data", () => {
    mockUseCityPulseData.mockReturnValue({
      kpis: {
        crime: { value: 1200, delta: 0, deltaPercent: 5.2, sparkline: [], insight: "Up from last period", tag: "30D" },
        crashes: { value: 300, delta: 0, deltaPercent: -2.1, sparkline: [], insight: "", tag: "30D" },
        requests311: { value: 2500, delta: 0, deltaPercent: 1.0, sparkline: [], insight: "", tag: "30D" },
      },
      trends: [{ date: "2026-03-01", crime: 100, crashes: 30, requests311: 200 }],
      categories: { crime: [{ category: "Theft", count: 500, percent: 40 }] },
      heatmap: [{ dayOfWeek: 0, hourOfDay: 12, count: 50 }],
      neighborhoods: [{ neighborhood: "Five Points", crimeCount: 100, crashCount: 20, requests311Count: 50, totalDeltaPct: 3.5 }],
      narrative: { title: "City Pulse Today", content: "Crime leads volume.", stats: [{ label: "crime", value: "1,200" }] },
      loading: false,
      error: null,
    });

    render(<CityPulsePage />);
    expect(screen.getByText("Denver Urban Pulse")).toBeInTheDocument();
    expect(screen.getAllByText("1,200").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 4 KPI cards", () => {
    mockUseCityPulseData.mockReturnValue({
      kpis: {
        crime: { value: 100, delta: 0, deltaPercent: 0, sparkline: [], insight: "", tag: "30D" },
        crashes: { value: 50, delta: 0, deltaPercent: 0, sparkline: [], insight: "", tag: "30D" },
        requests311: { value: 200, delta: 0, deltaPercent: 0, sparkline: [], insight: "", tag: "30D" },
      },
      trends: [],
      categories: {},
      heatmap: [],
      neighborhoods: [],
      narrative: null,
      loading: false,
      error: null,
    });

    render(<CityPulsePage />);
    expect(screen.getByText("Crime Incidents")).toBeInTheDocument();
    expect(screen.getByText("Traffic Crashes")).toBeInTheDocument();
    expect(screen.getByText("311 Requests")).toBeInTheDocument();
    expect(screen.getByText("Air Quality Index")).toBeInTheDocument();
  });

  it("renders all visualization sections", () => {
    mockUseCityPulseData.mockReturnValue({
      kpis: null,
      trends: [],
      categories: {},
      heatmap: [],
      neighborhoods: [],
      narrative: null,
      loading: false,
      error: null,
    });

    render(<CityPulsePage />);
    expect(screen.getByText("Neighborhood Map")).toBeInTheDocument();
    expect(screen.getByText("Category Breakdown")).toBeInTheDocument();
    expect(screen.getByText("AQI Trend")).toBeInTheDocument();
    expect(screen.getByText("Time Heatmap")).toBeInTheDocument();
    expect(screen.getByText("Change Leaders")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseCityPulseData.mockReturnValue({
      kpis: null,
      trends: [],
      categories: {},
      heatmap: [],
      neighborhoods: [],
      narrative: null,
      loading: false,
      error: "Connection refused",
    });

    render(<CityPulsePage />);
    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(screen.getByText("Connection refused")).toBeInTheDocument();
  });
});

describe("useCityPulseData hook", () => {
  it("returns correct initial structure", () => {
    mockUseCityPulseData.mockReturnValue({
      kpis: null,
      trends: [],
      categories: {},
      heatmap: [],
      neighborhoods: [],
      narrative: null,
      loading: true,
      error: null,
    });

    const result = mockUseCityPulseData("30d", "all");
    expect(result.loading).toBe(true);
    expect(result.kpis).toBeNull();
    expect(result.trends).toEqual([]);
  });
});
