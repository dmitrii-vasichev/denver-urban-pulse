import { render, screen } from "@testing-library/react";

// Mock react-leaflet to avoid DOM errors in jsdom
jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  GeoJSON: () => <div data-testid="geojson-layer" />,
  Tooltip: () => <div />,
}));

jest.mock("leaflet/dist/leaflet.css", () => ({}));

import { DenverMap } from "@/components/map/denver-map";

const emptyGeojson: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const sampleGeojson: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Five Points", nbhd_id: 27 },
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
    },
  ],
};

describe("DenverMap", () => {
  it("renders map container with tile layer", () => {
    render(
      <DenverMap geojson={sampleGeojson} data={[]} />
    );
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
  });

  it("renders GeoJSON layer", () => {
    render(
      <DenverMap
        geojson={sampleGeojson}
        data={[
          {
            neighborhood: "Five Points",
            crimeCount: 100,
            crashCount: 20,
            requests311Count: 50,
            totalDeltaPct: 3.5,
          },
        ]}
      />
    );
    expect(screen.getByTestId("geojson-layer")).toBeInTheDocument();
  });

  it("handles empty GeoJSON without crashing", () => {
    const { container } = render(
      <DenverMap geojson={emptyGeojson} data={[]} />
    );
    expect(container).toBeTruthy();
  });
});
