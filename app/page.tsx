"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { ChartCard } from "@/components/cards/chart-card";
import { CategoryChart } from "@/components/charts/category-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { AqiTrendChart } from "@/components/charts/aqi-trend-chart";
import { ChangeLeadersChart } from "@/components/charts/change-leaders-chart";
import { DenverMapDynamic } from "@/components/map/denver-map-dynamic";
import { useFilters } from "@/lib/hooks/use-filters";
import { useCityPulseData } from "@/lib/hooks/use-city-pulse-data";
import { useEnvironmentData } from "@/lib/hooks/use-environment-data";
import { ErrorCard } from "@/components/cards/error-card";
import { formatAqi } from "@/lib/format";
import geojson from "@/data/geo/denver-neighborhoods.json";

function CityPulseContent() {
  const { timeWindow, neighborhood } = useFilters();
  const { kpis, categories, categoryTrends, heatmapCrime, heatmapCrashes, neighborhoods, loading, error, retry, effectiveThrough, lastUpdated } =
    useCityPulseData(timeWindow, neighborhood);
  const { aqi, comparison, loading: envLoading, error: envError, retry: envRetry, effectiveThrough: envEffectiveThrough } =
    useEnvironmentData(timeWindow, neighborhood);

  // Global cutoff: the earliest effectiveThrough across all data sources (for header display)
  const globalEffectiveThrough = effectiveThrough && envEffectiveThrough
    ? (effectiveThrough < envEffectiveThrough ? effectiveThrough : envEffectiveThrough)
    : effectiveThrough ?? envEffectiveThrough;

  // AQI data is already filtered by its own effectiveThrough in the API layer.
  // Do NOT re-filter it by globalEffectiveThrough — when City Pulse data lags behind
  // AQI data, the global cutoff would incorrectly trim most AQI points.

  const combinedError = error || envError;

  if (combinedError) {
    return (
      <PageShell
        title="City Pulse"
        subtitle="Crime, crashes, and 311 requests across Denver"
      >
        <ErrorCard message={combinedError} onRetry={() => { retry(); envRetry(); }} />
      </PageShell>
    );
  }

  const tagLabel = timeWindow.toUpperCase();
  const aqiInfo = aqi.current ? formatAqi(aqi.current.aqi) : null;

  // AQI sparkline: convert trend to ChartPoint[]
  const aqiSparkline = aqi.trend.map((p) => ({
    date: p.date,
    value: p.aqiMax,
  }));

  // Dominant pollutant label from latest trend point
  const aqiInsight = (() => {
    const latest = aqi.trend[aqi.trend.length - 1];
    if (!latest) return undefined;
    const pollutants = [
      { value: latest.aqiOzone, label: "Ozone" },
      { value: latest.aqiPm25, label: "Fine Particles" },
      { value: latest.aqiPm10, label: "Coarse Particles" },
    ].filter((p) => p.value != null);
    if (pollutants.length === 0) return undefined;
    const dominant = pollutants.reduce((a, b) => (b.value > a.value ? b : a));
    return `Driven by ${dominant.label}`;
  })();

  return (
    <PageShell
      title="Denver Urban Pulse"
      subtitle="Crime, crashes, 311 requests, and air quality across Denver"
      lastUpdated={lastUpdated}
      effectiveThrough={globalEffectiveThrough}
    >
      {/* Row 1: KPI Strip — 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <KpiCard
          className="lg:col-span-3"
          title="Crime Incidents"
          tag={tagLabel}
          value={kpis?.crime.value}
          deltaPercent={kpis?.crime.deltaPercent}
          sparklineData={kpis?.crime.sparkline}
          sparklineLabel="incidents"
          insight={kpis?.crime.insight}
          color="#2458C6"
          loading={loading}
        />
        <KpiCard
          className="lg:col-span-3"
          title="Traffic Crashes"
          tag={tagLabel}
          value={kpis?.crashes.value}
          deltaPercent={kpis?.crashes.deltaPercent}
          sparklineData={kpis?.crashes.sparkline}
          sparklineLabel="crashes"
          insight={kpis?.crashes.insight}
          color="#D97904"
          loading={loading}
        />
        <KpiCard
          className="lg:col-span-3"
          title="311 Requests"
          tag={tagLabel}
          value={kpis?.requests311.value}
          deltaPercent={kpis?.requests311.deltaPercent}
          sparklineData={kpis?.requests311.sparkline}
          sparklineLabel="requests"
          insight={kpis?.requests311.insight}
          color="#198754"
          loading={loading}
        />
        <KpiCard
          className="lg:col-span-3"
          title="Air Quality Index"
          tag="Current"
          secondaryTag={aqiInfo?.label}
          value={aqi.current?.aqi}
          sparklineData={aqiSparkline}
          sparklineLabel="AQI"
          insight={aqiInsight}
          color="#0B4F8C"
          loading={envLoading}
        />
      </div>

      {/* Row 2: Neighborhood Map (7/12) + Category Breakdown (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-7">
          <ChartCard title="Neighborhood Map" loading={loading} className="h-full">
            <div className="flex-1 min-h-[200px] -m-2 rounded-lg overflow-hidden">
              <DenverMapDynamic
                geojson={geojson as unknown as GeoJSON.FeatureCollection}
                data={neighborhoods}
                selectedNeighborhood={neighborhood !== "all" ? neighborhood : undefined}
              />
            </div>
          </ChartCard>
        </div>
        <div className="lg:col-span-5">
          <ChartCard title="Category Breakdown" loading={loading} className="h-full">
            <CategoryChart data={categories} trends={categoryTrends} />
          </ChartCard>
        </div>
      </div>

      {/* Row 3: AQI Trend (full-width) */}
      <ChartCard title="AQI Trend" loading={envLoading}>
        <AqiTrendChart data={aqi.trend} />
      </ChartCard>

      {/* Row 4: Heatmaps — Crime + Crashes side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard title="Crime by Hour & Day" loading={loading}>
          <HeatmapChart data={heatmapCrime} />
        </ChartCard>
        <ChartCard title="Crashes by Hour & Day" loading={loading}>
          <HeatmapChart data={heatmapCrashes} />
        </ChartCard>
      </div>

      {/* Row 5: Change Leaders (full-width) */}
      <ChartCard title="Change Leaders" loading={envLoading}>
        <ChangeLeadersChart data={comparison} />
      </ChartCard>
    </PageShell>
  );
}

export default function CityPulsePage() {
  return (
    <Suspense fallback={<CityPulseSkeleton />}>
      <CityPulseContent />
    </Suspense>
  );
}

function CityPulseSkeleton() {
  return (
    <PageShell
      title="Denver Urban Pulse"
      subtitle="Crime, crashes, 311 requests, and air quality across Denver"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <KpiCard key={i} className="lg:col-span-3" title="" value={0} color="#ccc" loading />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7">
          <ChartCard title="Neighborhood Map" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
        <div className="lg:col-span-5">
          <ChartCard title="Category Breakdown" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
      </div>
      <ChartCard title="AQI Trend" loading>
        <div className="h-48" />
      </ChartCard>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard title="Crime by Hour & Day" loading>
          <div className="h-48" />
        </ChartCard>
        <ChartCard title="Crashes by Hour & Day" loading>
          <div className="h-48" />
        </ChartCard>
      </div>
      <ChartCard title="Change Leaders" loading>
        <div className="h-48" />
      </ChartCard>
    </PageShell>
  );
}
