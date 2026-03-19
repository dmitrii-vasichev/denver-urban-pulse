"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import { NeighborhoodLayer } from "./neighborhood-layer";
import type { NeighborhoodRow } from "@/lib/types";
import "leaflet/dist/leaflet.css";

interface DenverMapProps {
  geojson: GeoJSON.FeatureCollection;
  data: NeighborhoodRow[];
  selectedNeighborhood?: string;
  colorBy?: "crime" | "crashes";
}

const DENVER_CENTER: [number, number] = [39.74, -104.99];
const DEFAULT_ZOOM = 11;

export function DenverMap({ geojson, data, selectedNeighborhood, colorBy = "crime" }: DenverMapProps) {
  return (
    <MapContainer
      center={DENVER_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom={true}
      className="h-full w-full rounded-lg"
      style={{ minHeight: 300 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <NeighborhoodLayer
        geojson={geojson}
        data={data}
        selectedNeighborhood={selectedNeighborhood}
        colorBy={colorBy}
      />
    </MapContainer>
  );
}
