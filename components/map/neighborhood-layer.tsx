"use client";

import { GeoJSON } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature, Geometry } from "geojson";
import { useMemo, useCallback } from "react";
import type { NeighborhoodRow } from "@/lib/types";
import { formatNumber } from "@/lib/format";

interface NeighborhoodLayerProps {
  geojson: GeoJSON.FeatureCollection;
  data: NeighborhoodRow[];
  selectedNeighborhood?: string;
}

const COLOR_LIGHT = [0xee, 0xf3, 0xf8];
const COLOR_DARK = [0x0b, 0x4f, 0x8c];

function interpolate(ratio: number): string {
  const r = Math.round(COLOR_LIGHT[0] + (COLOR_DARK[0] - COLOR_LIGHT[0]) * ratio);
  const g = Math.round(COLOR_LIGHT[1] + (COLOR_DARK[1] - COLOR_LIGHT[1]) * ratio);
  const b = Math.round(COLOR_LIGHT[2] + (COLOR_DARK[2] - COLOR_LIGHT[2]) * ratio);
  return `rgb(${r},${g},${b})`;
}

export function NeighborhoodLayer({
  geojson,
  data,
  selectedNeighborhood,
}: NeighborhoodLayerProps) {
  const dataMap = useMemo(() => {
    const m = new Map<string, NeighborhoodRow>();
    for (const row of data) m.set(row.neighborhood, row);
    return m;
  }, [data]);

  const maxTotal = useMemo(() => {
    let max = 1;
    for (const row of data) {
      const total = row.crimeCount + row.crashCount + row.requests311Count;
      if (total > max) max = total;
    }
    return max;
  }, [data]);

  const style = useCallback(
    (feature?: Feature<Geometry>): PathOptions => {
      const name = feature?.properties?.name as string | undefined;
      const row = name ? dataMap.get(name) : undefined;
      const total = row
        ? row.crimeCount + row.crashCount + row.requests311Count
        : 0;
      const ratio = total / maxTotal;
      const isSelected = name === selectedNeighborhood;

      return {
        fillColor: total > 0 ? interpolate(ratio) : "#EEF3F8",
        fillOpacity: 0.75,
        color: isSelected ? "#102A43" : "#FFFFFF",
        weight: isSelected ? 2.5 : 1,
        opacity: 1,
      };
    },
    [dataMap, maxTotal, selectedNeighborhood]
  );

  const onEachFeature = useCallback(
    (feature: Feature<Geometry>, layer: Layer) => {
      const name = feature.properties?.name as string;
      const row = dataMap.get(name);

      const lines = [
        `<strong style="font-size:11px;color:#102A43">${name}</strong>`,
        row
          ? `<span style="font-size:10px;color:#52667A">Crime: ${formatNumber(row.crimeCount)} · Crashes: ${formatNumber(row.crashCount)} · 311: ${formatNumber(row.requests311Count)}</span>`
          : '<span style="font-size:10px;color:#627D98">No data</span>',
      ];

      layer.bindTooltip(lines.join("<br/>"), {
        sticky: true,
        direction: "top",
        className: "leaflet-tooltip-custom",
      });

      layer.on({
        mouseover: (e) => {
          const target = e.target;
          target.setStyle({ weight: 2, color: "#102A43" });
          target.bringToFront();
        },
        mouseout: (e) => {
          const target = e.target;
          target.setStyle(style(feature));
        },
      });
    },
    [dataMap, style]
  );

  return (
    <GeoJSON
      key={`${data.length}-${selectedNeighborhood}`}
      data={geojson}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}
