"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AqiDailyPoint,
  AqiCurrent,
  ComparisonRow,
  TimeWindow,
} from "@/lib/types";

interface EnvironmentData {
  aqi: { current: AqiCurrent | null; trend: AqiDailyPoint[] };
  comparison: ComparisonRow[];
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

export function useEnvironmentData(
  timeWindow: TimeWindow,
  neighborhood: string
): EnvironmentData {
  const [data, setData] = useState<Omit<EnvironmentData, "retry">>({
    aqi: { current: null, trend: [] },
    comparison: [],
    effectiveThrough: null,
    lastUpdated: null,
    loading: true,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const qs = `timeWindow=${timeWindow}${neighborhood !== "all" ? `&neighborhood=${encodeURIComponent(neighborhood)}` : ""}`;

      const [aqiResp, comparison] = await Promise.all([
        fetch(`/api/environment/aqi?${qs}`).then(async (r) => {
          if (!r.ok) throw new Error(`API error: ${r.status}`);
          return r.json();
        }),
        fetchJson<ComparisonRow[]>(`/api/environment/comparison?${qs}`),
      ]);

      setData({
        aqi: aqiResp.data,
        comparison,
        effectiveThrough: aqiResp.effectiveThrough ?? null,
        lastUpdated: aqiResp.lastUpdated ?? null,
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
