"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  KpiData,
  TrendPoint,
  CategoryBreakdown,
  HeatmapCell,
  NeighborhoodRow,
  NarrativeData,
  TimeWindow,
} from "@/lib/types";

interface CityPulseData {
  kpis: { crime: KpiData; crashes: KpiData; requests311: KpiData } | null;
  trends: TrendPoint[];
  categories: Record<string, CategoryBreakdown[]>;
  heatmap: HeatmapCell[];
  neighborhoods: NeighborhoodRow[];
  narrative: NarrativeData | null;
  effectiveThrough: string | null;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export function useCityPulseData(
  timeWindow: TimeWindow,
  neighborhood: string
): CityPulseData {
  const [data, setData] = useState<Omit<CityPulseData, "retry">>({
    kpis: null,
    trends: [],
    categories: {},
    heatmap: [],
    neighborhoods: [],
    narrative: null,
    effectiveThrough: null,
    lastUpdated: null,
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const qs = `timeWindow=${timeWindow}${neighborhood !== "all" ? `&neighborhood=${encodeURIComponent(neighborhood)}` : ""}`;

      const [kpis, trendsResp, categories, heatmap, neighborhoods, narrative] =
        await Promise.all([
          fetchJson<CityPulseData["kpis"]>(`/api/city-pulse/kpis?${qs}`),
          fetch(`/api/city-pulse/trends?${qs}`).then(async (r) => {
            if (!r.ok) throw new Error(`API error: ${r.status}`);
            return r.json();
          }),
          fetchJson<Record<string, CategoryBreakdown[]>>(
            `/api/city-pulse/categories?${qs}`
          ),
          fetchJson<HeatmapCell[]>(`/api/city-pulse/heatmap?${qs}`),
          fetchJson<NeighborhoodRow[]>(
            `/api/city-pulse/neighborhoods?timeWindow=${timeWindow}`
          ),
          fetchJson<NarrativeData>(`/api/city-pulse/narrative?${qs}`),
        ]);

      setData({
        kpis,
        trends: trendsResp.data.series,
        categories,
        heatmap,
        neighborhoods,
        narrative,
        effectiveThrough: trendsResp.effectiveThrough ?? null,
        lastUpdated: trendsResp.lastUpdated ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load data",
      }));
    }
  }, [timeWindow, neighborhood]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { ...data, retry: fetchAll };
}
