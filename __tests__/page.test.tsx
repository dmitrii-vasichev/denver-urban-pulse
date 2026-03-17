import { render, screen } from "@testing-library/react";
import CityPulsePage from "@/app/page";

// Mock next/navigation for Header component
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock fetch for NeighborhoodFilter
global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({ data: [] }) })
) as jest.Mock;

// Mock recharts
jest.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("CityPulsePage", () => {
  it("renders the page heading", () => {
    render(<CityPulsePage />);
    expect(
      screen.getByRole("heading", { name: /denver urban pulse/i })
    ).toBeInTheDocument();
  });

  it("renders KPI cards in loading state", () => {
    const { container } = render(<CityPulsePage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders grid structure with expected sections", () => {
    const { container } = render(<CityPulsePage />);
    // 3 grid sections: KPI row, map+categories row, heatmaps row
    const grids = container.querySelectorAll(".grid");
    expect(grids.length).toBe(3);
  });
});
