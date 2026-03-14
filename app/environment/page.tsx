"use client";

import { Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { ChartCard } from "@/components/cards/chart-card";
import { NarrativeBlock } from "@/components/cards/narrative-block";
import { AqiTrendChart } from "@/components/charts/aqi-trend-chart";
import { NeighborhoodRankingChart } from "@/components/charts/neighborhood-ranking-chart";
import { NeighborhoodComparisonChart } from "@/components/charts/neighborhood-comparison-chart";
import { ChangeLeadersChart } from "@/components/charts/change-leaders-chart";
import { DenverMapDynamic } from "@/components/map/denver-map-dynamic";
import { useFilters } from "@/lib/hooks/use-filters";
import { useEnvironmentData } from "@/lib/hooks/use-environment-data";
import { formatAqi } from "@/lib/format";
import geojson from "@/data/geo/denver-neighborhoods.json";
import type { NeighborhoodRow } from "@/lib/types";

function EnvironmentContent() {
  const { timeWindow, neighborhood } = useFilters();
  const { aqi, rankings, comparison, narrative, loading, error } =
    useEnvironmentData(timeWindow, neighborhood);

  if (error) {
    return (
      <div className="rounded-[14px] bg-white border border-[#DDE3EA] p-6 text-center">
        <p className="text-sm text-[#DC3545] font-medium">Failed to load data</p>
        <p className="text-xs text-[#627D98] mt-1">{error}</p>
      </div>
    );
  }

  const tagLabel = timeWindow.toUpperCase();
  const aqiInfo = aqi.current ? formatAqi(aqi.current.aqi) : null;

  const safest = rankings.length > 0
    ? rankings.reduce((a, b) => (a.compositeScore < b.compositeScore ? a : b))
    : null;

  const mostActive = rankings.length > 0
    ? rankings.reduce((a, b) => (a.compositeScore > b.compositeScore ? a : b))
    : null;

  const mostImproved = comparison.length > 0
    ? comparison.reduce((a, b) => {
        const da = (a.crimeDeltaPct + a.crashDeltaPct + a.requests311DeltaPct) / 3;
        const db = (b.crimeDeltaPct + b.crashDeltaPct + b.requests311DeltaPct) / 3;
        return da < db ? a : b;
      })
    : null;

  const mapData: NeighborhoodRow[] = rankings.map((r) => ({
    neighborhood: r.neighborhood,
    crimeCount: r.crimeCount,
    crashCount: r.crashCount,
    requests311Count: r.requests311Count,
    totalDeltaPct: 0,
  }));

  return (
    <>
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Air Quality Index"
          tag="Current"
          secondaryTag={aqiInfo?.label}
          value={aqi.current?.aqi}
          insight={narrative?.stats?.[0]?.value}
          color="#0B4F8C"
          loading={loading}
        />
        <KpiCard
          title="Safest Neighborhood"
          tag={tagLabel}
          value={safest?.compositeScore}
          insight={safest?.neighborhood}
          color="#198754"
          loading={loading}
        />
        <KpiCard
          title="Most Active Area"
          tag={tagLabel}
          value={mostActive?.compositeScore}
          insight={mostActive?.neighborhood}
          color="#D97904"
          loading={loading}
        />
        <KpiCard
          title="Most Improved"
          tag={tagLabel}
          value={mostImproved ? Math.round((mostImproved.crimeDeltaPct + mostImproved.crashDeltaPct + mostImproved.requests311DeltaPct) / 3) : undefined}
          insight={mostImproved?.neighborhood}
          color="#2458C6"
          loading={loading}
        />
      </div>

      {/* Hero Row — 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <ChartCard title="AQI Trend" loading={loading}>
            <AqiTrendChart data={aqi.trend} />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <NarrativeBlock
            title={narrative?.title ?? "Environment Today"}
            content={narrative?.content ?? ""}
            stats={narrative?.stats}
            loading={loading}
          />
        </div>
      </div>

      {/* Lower Analytics — 2×2 grid + map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard title="Neighborhood Rankings" loading={loading}>
          <NeighborhoodRankingChart data={mapData} />
        </ChartCard>
        <ChartCard title="Neighborhood Comparison" loading={loading}>
          <NeighborhoodComparisonChart data={comparison} />
        </ChartCard>
        <ChartCard title="Neighborhood Map" loading={loading}>
          <div className="h-64 md:h-[300px] -m-2 rounded-lg overflow-hidden">
            <DenverMapDynamic
              geojson={geojson as unknown as GeoJSON.FeatureCollection}
              data={mapData}
              selectedNeighborhood={neighborhood !== "all" ? neighborhood : undefined}
            />
          </div>
        </ChartCard>
        <ChartCard title="Change Leaders" loading={loading}>
          <ChangeLeadersChart data={comparison} />
        </ChartCard>
      </div>
    </>
  );
}

export default function EnvironmentPage() {
  return (
    <PageShell
      title="Environment & Neighborhoods"
      subtitle="Air quality and neighborhood analytics"
    >
      <Suspense fallback={<EnvironmentSkeleton />}>
        <EnvironmentContent />
      </Suspense>
    </PageShell>
  );
}

function EnvironmentSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <KpiCard key={i} title="" value={0} color="#ccc" loading />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <ChartCard title="AQI Trend" loading>
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
