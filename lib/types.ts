// Shared TypeScript types for Denver Urban Pulse

export type TimeWindow = "7d" | "30d" | "90d";

export interface KpiData {
  value: number;
  delta: number;
  deltaPercent: number;
  sparkline: ChartPoint[];
  insight: string;
  tag: string;
  secondaryTag?: string;
}

export interface ChartPoint {
  date: string;
  value: number;
}

export interface NarrativeData {
  title: string;
  content: string;
  stats: NarrativeStat[];
}

export interface NarrativeStat {
  label: string;
  value: string;
}

export interface NarrativeSignal {
  signalType: string;
  signalKey: string;
  signalValue: string;
  signalNumeric: number | null;
}

export interface NeighborhoodInfo {
  name: string;
}

export interface ApiResponse<T> {
  data: T;
  lastUpdated: string;
  error?: string;
}

export interface HealthStatus {
  ok: boolean;
  lastUpdated: string;
  sources: {
    crime: string;
    crashes: string;
    "311": string;
    aqi: string;
  };
}

export type AqiLevel =
  | "Good"
  | "Moderate"
  | "Unhealthy for Sensitive Groups"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

export interface AqiInfo {
  value: number;
  label: string;
  level: AqiLevel;
}

export interface TrendPoint {
  date: string;
  crime: number;
  crashes: number;
  requests311: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  percent: number;
}

export interface HeatmapCell {
  dayOfWeek: number;
  hourOfDay: number;
  count: number;
}

export interface NeighborhoodRow {
  neighborhood: string;
  crimeCount: number;
  crashCount: number;
  requests311Count: number;
  totalDeltaPct: number;
}

export interface RankingRow {
  neighborhood: string;
  crimeCount: number;
  crashCount: number;
  requests311Count: number;
  compositeScore: number;
  rank: number;
}

export interface ComparisonRow {
  neighborhood: string;
  crimeRate: number;
  crashRate: number;
  requests311Rate: number;
  crimeDeltaPct: number;
  crashDeltaPct: number;
  requests311DeltaPct: number;
}

export interface AqiDailyPoint {
  date: string;
  aqiMax: number;
  aqiOzone: number;
  aqiPm25: number;
  aqiPm10: number;
  category: string;
}

export interface AqiCurrent {
  aqi: number;
  category: string;
}
