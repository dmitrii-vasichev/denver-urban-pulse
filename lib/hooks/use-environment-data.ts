"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AqiDailyPoint,
  AqiCurrent,
  RankingRow,
  ComparisonRow,
  NarrativeData,
  TimeWindow,
} from "@/lib/types";

interface EnvironmentData {
  aqi: { current: AqiCurrent | null; trend: AqiDailyPoint[] };
  rankings: RankingRow[];
  comparison: ComparisonRow[];
  narrative: NarrativeData | null;
  loading: boolean;
  error: string | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export function useEnvironmentData(
  timeWindow: TimeWindow,
  neighborhood: string
): EnvironmentData {
  const [data, setData] = useState<EnvironmentData>({
    aqi: { current: null, trend: [] },
    rankings: [],
    comparison: [],
    narrative: null,
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const qs = `timeWindow=${timeWindow}${neighborhood !== "all" ? `&neighborhood=${encodeURIComponent(neighborhood)}` : ""}`;

      const [aqi, rankings, comparison, narrative] = await Promise.all([
        fetchJson<{ current: AqiCurrent | null; trend: AqiDailyPoint[] }>(
          `/api/environment/aqi?${qs}`
        ),
        fetchJson<RankingRow[]>(
          `/api/environment/rankings?timeWindow=${timeWindow}`
        ),
        fetchJson<ComparisonRow[]>(`/api/environment/comparison?${qs}`),
        fetchJson<NarrativeData>(`/api/environment/narrative?${qs}`),
      ]);

      setData({
        aqi,
        rankings,
        comparison,
        narrative,
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

  return data;
}
