"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { ChartCard } from "@/components/cards/chart-card";
import { NarrativeBlock } from "@/components/cards/narrative-block";
import { TrendChart } from "@/components/charts/trend-chart";
import { CategoryChart } from "@/components/charts/category-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { NeighborhoodRankingChart } from "@/components/charts/neighborhood-ranking-chart";
import { DenverMapDynamic } from "@/components/map/denver-map-dynamic";
import { useFilters } from "@/lib/hooks/use-filters";
import { useCityPulseData } from "@/lib/hooks/use-city-pulse-data";
import { ErrorCard } from "@/components/cards/error-card";
import geojson from "@/data/geo/denver-neighborhoods.json";

function CityPulseContent() {
  const { timeWindow, neighborhood } = useFilters();
  const { kpis, trends, categories, heatmap, neighborhoods, narrative, loading, error, retry } =
    useCityPulseData(timeWindow, neighborhood);

  if (error) {
    return <ErrorCard message={error} onRetry={retry} />;
  }

  const tagLabel = timeWindow.toUpperCase();

  return (
    <>
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          title="Crime Incidents"
          tag={tagLabel}
          value={kpis?.crime.value ?? 0}
          deltaPercent={kpis?.crime.deltaPercent}
          sparklineData={kpis?.crime.sparkline}
          insight={kpis?.crime.insight}
          color="#2458C6"
          loading={loading}
        />
        <KpiCard
          title="Traffic Crashes"
          tag={tagLabel}
          value={kpis?.crashes.value ?? 0}
          deltaPercent={kpis?.crashes.deltaPercent}
          sparklineData={kpis?.crashes.sparkline}
          insight={kpis?.crashes.insight}
          color="#D97904"
          loading={loading}
        />
        <KpiCard
          title="311 Requests"
          tag={tagLabel}
          value={kpis?.requests311.value ?? 0}
          deltaPercent={kpis?.requests311.deltaPercent}
          sparklineData={kpis?.requests311.sparkline}
          insight={kpis?.requests311.insight}
          color="#198754"
          loading={loading}
        />
      </div>

      {/* Hero Row — 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <ChartCard title="Incident Trends" loading={loading}>
            <TrendChart data={trends} />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <NarrativeBlock
            title={narrative?.title ?? "City Pulse Today"}
            content={narrative?.content ?? ""}
            stats={narrative?.stats}
            loading={loading}
          />
        </div>
      </div>

      {/* Lower Analytics — 2×2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard title="Category Breakdown" loading={loading}>
          <CategoryChart data={categories} />
        </ChartCard>
        <ChartCard title="Time Heatmap" loading={loading}>
          <HeatmapChart data={heatmap} />
        </ChartCard>
        <ChartCard title="Neighborhood Map" loading={loading}>
          <div className="h-[300px] -m-2 rounded-lg overflow-hidden">
            <DenverMapDynamic
              geojson={geojson as unknown as GeoJSON.FeatureCollection}
              data={neighborhoods}
              selectedNeighborhood={neighborhood !== "all" ? neighborhood : undefined}
            />
          </div>
        </ChartCard>
        <ChartCard title="Top Neighborhoods" loading={loading}>
          <NeighborhoodRankingChart data={neighborhoods} />
        </ChartCard>
      </div>
    </>
  );
}

export default function CityPulsePage() {
  return (
    <PageShell
      title="City Pulse"
      subtitle="Crime, crashes, and 311 requests across Denver"
    >
      <Suspense fallback={<CityPulseSkeleton />}>
        <CityPulseContent />
      </Suspense>
    </PageShell>
  );
}

function CityPulseSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <KpiCard key={i} title="" value={0} color="#ccc" loading />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <ChartCard title="Incident Trends" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <NarrativeBlock title="" content="" loading />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <ChartCard key={i} title="" loading>
            <div className="h-48" />
          </ChartCard>
        ))}
      </div>
    </>
  );
}
