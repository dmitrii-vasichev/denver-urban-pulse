"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  KpiData,
  CategoryBreakdown,
  CategoryTrends,
  DomainFreshness,
  HeatmapCell,
  NeighborhoodRow,
  TimeWindow,
} from "@/lib/types";

interface CityPulseData {
  kpis: { crime: KpiData; crashes: KpiData; requests311: KpiData } | null;
  categories: Record<string, CategoryBreakdown[]>;
  categoryTrends: CategoryTrends;
  heatmapCrime: HeatmapCell[];
  heatmapCrashes: HeatmapCell[];
  neighborhoods: NeighborhoodRow[];
  effectiveThrough: string | null;
  domainFreshness: DomainFreshness | null;
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
    categories: {},
    categoryTrends: {},
    heatmapCrime: [],
    heatmapCrashes: [],
    neighborhoods: [],
    effectiveThrough: null,
    domainFreshness: null,
    lastUpdated: null,
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const qs = `timeWindow=${timeWindow}${neighborhood !== "all" ? `&neighborhood=${encodeURIComponent(neighborhood)}` : ""}`;

      const kpisUrl = `/api/city-pulse/kpis?${qs}`;
      const kpisResp = await fetch(kpisUrl).then(async (r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      });

      const [categories, categoryTrends, heatmapCrime, heatmapCrashes, neighborhoods] = await Promise.all([
        fetchJson<Record<string, CategoryBreakdown[]>>(
          `/api/city-pulse/categories?${qs}`
        ),
        fetchJson<CategoryTrends>(
          `/api/city-pulse/category-trends?${qs}`
        ),
        fetchJson<HeatmapCell[]>(`/api/city-pulse/heatmap?${qs}&domain=crime`),
        fetchJson<HeatmapCell[]>(`/api/city-pulse/heatmap?${qs}&domain=crashes`),
        fetchJson<NeighborhoodRow[]>(
          `/api/city-pulse/neighborhoods?timeWindow=${timeWindow}`
        ),
      ]);

      setData({
        kpis: kpisResp.data,
        categories,
        categoryTrends,
        heatmapCrime,
        heatmapCrashes,
        neighborhoods,
        effectiveThrough: kpisResp.effectiveThrough ?? null,
        domainFreshness: kpisResp.domainFreshness ?? null,
        lastUpdated: kpisResp.lastUpdated ?? null,
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
