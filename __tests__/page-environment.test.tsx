import { render, screen } from "@testing-library/react";

// Mock global fetch
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
  usePathname: () => "/environment",
}));

// Mock recharts
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

import EnvironmentPage from "@/app/environment/page";
import { useEnvironmentData } from "@/lib/hooks/use-environment-data";

jest.mock("@/lib/hooks/use-environment-data");
const mockUseEnvironmentData = useEnvironmentData as jest.MockedFunction<typeof useEnvironmentData>;

describe("EnvironmentPage", () => {
  it("renders loading state", () => {
    mockUseEnvironmentData.mockReturnValue({
      aqi: { current: null, trend: [] },
      rankings: [],
      comparison: [],
      narrative: null,
      loading: true,
      error: null,
    });

    const { container } = render(<EnvironmentPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders with data", () => {
    mockUseEnvironmentData.mockReturnValue({
      aqi: {
        current: { aqi: 42, category: "Good" },
        trend: [{ date: "2026-03-01", aqiMax: 42, aqiOzone: 38, aqiPm25: 42, aqiPm10: 15, category: "Good" }],
      },
      rankings: [
        { neighborhood: "Highlands", crimeCount: 50, crashCount: 10, requests311Count: 30, compositeScore: 15.2, rank: 1 },
        { neighborhood: "CBD", crimeCount: 200, crashCount: 60, requests311Count: 120, compositeScore: 85.5, rank: 78 },
      ],
      comparison: [
        { neighborhood: "Highlands", crimeRate: 5.0, crashRate: 1.5, requests311Rate: 3.0, crimeDeltaPct: -3.0, crashDeltaPct: -2.0, requests311DeltaPct: -1.0 },
      ],
      narrative: { title: "Environment Today", content: "Air quality is good.", stats: [{ label: "AQI", value: "42" }] },
      loading: false,
      error: null,
    });

    render(<EnvironmentPage />);
    expect(screen.getByText("Environment & Neighborhoods")).toBeInTheDocument();
    expect(screen.getByText("Air quality is good.")).toBeInTheDocument();
    expect(screen.getAllByText("42").length).toBeGreaterThanOrEqual(1);
  });

  it("renders error state", () => {
    mockUseEnvironmentData.mockReturnValue({
      aqi: { current: null, trend: [] },
      rankings: [],
      comparison: [],
      narrative: null,
      loading: false,
      error: "Connection refused",
    });

    render(<EnvironmentPage />);
    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(screen.getByText("Connection refused")).toBeInTheDocument();
  });
});

describe("useEnvironmentData hook", () => {
  it("returns correct initial structure", () => {
    mockUseEnvironmentData.mockReturnValue({
      aqi: { current: null, trend: [] },
      rankings: [],
      comparison: [],
      narrative: null,
      loading: true,
      error: null,
    });

    const result = mockUseEnvironmentData("30d", "all");
    expect(result.loading).toBe(true);
    expect(result.aqi.current).toBeNull();
    expect(result.rankings).toEqual([]);
    expect(result.comparison).toEqual([]);
    expect(result.narrative).toBeNull();
  });
});
