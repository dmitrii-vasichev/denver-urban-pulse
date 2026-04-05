"use client";

import { useState, Suspense } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { ChartCard } from "@/components/cards/chart-card";
import { CategoryChart } from "@/components/charts/category-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { AqiTrendChart } from "@/components/charts/aqi-trend-chart";
import { ChangeLeadersChart } from "@/components/charts/change-leaders-chart";
import { NeighborhoodRankingChart } from "@/components/charts/neighborhood-ranking-chart";
import { DenverMapDynamic } from "@/components/map/denver-map-dynamic";
import { useFilters } from "@/lib/hooks/use-filters";
import { useCityPulseData } from "@/lib/hooks/use-city-pulse-data";
import { useEnvironmentData } from "@/lib/hooks/use-environment-data";
import { ErrorCard } from "@/components/cards/error-card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatAqi, formatDateRange } from "@/lib/format";
import geojsonRaw from "@/data/geo/denver-neighborhoods.json";

const geojson = geojsonRaw as unknown as GeoJSON.FeatureCollection;

import type { IncidentDomain } from "@/lib/types";

function DomainToggle({
  value,
  onChange,
}: {
  value: IncidentDomain;
  onChange: (v: IncidentDomain) => void;
}) {
  const options: { key: IncidentDomain; label: string }[] = [
    { key: "crime", label: "Crime" },
    { key: "crashes", label: "Crashes" },
  ];
  return (
    <div className="flex rounded-md bg-[#F0F4F8] p-0.5 gap-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
            value === o.key
              ? "bg-white text-[#102A43] shadow-sm"
              : "text-[#627D98] hover:text-[#334E68]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CityPulseContent() {
  const { timeWindow, neighborhood } = useFilters();
  const [heatmapDomain, setHeatmapDomain] = useState<IncidentDomain>("crime");
  const [mapDomain, setMapDomain] = useState<IncidentDomain>("crime");
  const [bottomRowDomain, setBottomRowDomain] = useState<IncidentDomain>("crime");
  const { kpis, categories, categoryTrends, heatmapCrime, heatmapCrashes, neighborhoods, loading, error, retry, domainFreshness, sourceFreshness, lastUpdated } =
    useCityPulseData(timeWindow, neighborhood);
  const { aqi, comparison, loading: envLoading, error: envError, retry: envRetry, effectiveThrough: envEffectiveThrough, aqiDateRange } =
    useEnvironmentData(timeWindow, neighborhood);

  // Build per-domain freshness including AQI
  const fullFreshness = domainFreshness
    ? { ...domainFreshness, aqi: envEffectiveThrough }
    : null;

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

  // Compute date range subtitles for chart cards
  // Category breakdown and heatmap use LEAST(max_dates) from pipeline, so use effectiveThrough
  const days = timeWindow === "7d" ? 7 : timeWindow === "30d" ? 30 : 90;
  const cityPulseSubtitle = (() => {
    const et = domainFreshness
      ? [domainFreshness.crime, domainFreshness.crashes, domainFreshness.requests311].filter(Boolean).reduce((a, b) => (a! < b! ? a : b), null as string | null)
      : null;
    if (!et) return undefined;
    const from = new Date(et + "T00:00:00Z");
    from.setUTCDate(from.getUTCDate() - days + 1);
    return formatDateRange(from.toISOString().split("T")[0], et);
  })();
  const aqiSubtitle = aqiDateRange
    ? formatDateRange(aqiDateRange.from, aqiDateRange.to)
    : undefined;
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
      domainFreshness={fullFreshness}
      sourceFreshness={sourceFreshness}
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
          dateRange={kpis?.crime.dateRange}
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
          dateRange={kpis?.crashes.dateRange}
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
          dateRange={kpis?.requests311.dateRange}
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
          dateRange={aqiDateRange}
        />
      </div>

      {/* Row 2: Neighborhood Map (7/12) + Category Breakdown (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-7">
          <ChartCard
            title="Incidents by Neighborhood"
            subtitle={cityPulseSubtitle}
            loading={loading}
            className="h-full"
            headerRight={
              <DomainToggle value={mapDomain} onChange={setMapDomain} />
            }
          >
            <div className="flex-1 min-h-[200px] -m-2 rounded-lg overflow-hidden">
              <DenverMapDynamic
                geojson={geojson}
                data={neighborhoods}
                selectedNeighborhood={neighborhood !== "all" ? neighborhood : undefined}
                colorBy={mapDomain}
              />
            </div>
          </ChartCard>
        </div>
        <div className="lg:col-span-5">
          <ChartCard title="Category Breakdown" subtitle={cityPulseSubtitle} loading={loading} className="h-full">
            <CategoryChart data={categories} trends={categoryTrends} />
          </ChartCard>
        </div>
      </div>

      {/* Row 3: AQI Trend (7/12) + Incidents by Day & Hour (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-7">
          <ChartCard title="AQI Trend" subtitle={aqiSubtitle} loading={envLoading} className="h-full">
            <AqiTrendChart data={aqi.trend} />
          </ChartCard>
        </div>
        <div className="lg:col-span-5">
          <ChartCard
            title="Incidents by Day & Hour"
            subtitle={cityPulseSubtitle}
            loading={loading}
            className="h-full"
            headerRight={
              <DomainToggle
                value={heatmapDomain}
                onChange={setHeatmapDomain}
              />
            }
          >
            <HeatmapChart data={heatmapDomain === "crime" ? heatmapCrime : heatmapCrashes} />
          </ChartCard>
        </div>
      </div>

      {/* Row 5: Neighborhood Ranking (7/12) + Change Leaders (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-7">
          <ChartCard
            title="Neighborhood Ranking"
            subtitle={cityPulseSubtitle}
            loading={loading}
            className="h-full"
            headerRight={
              <DomainToggle value={bottomRowDomain} onChange={setBottomRowDomain} />
            }
          >
            <NeighborhoodRankingChart data={neighborhoods} domain={bottomRowDomain} />
          </ChartCard>
        </div>
        <div className="lg:col-span-5">
          <ChartCard
            title="Change Leaders"
            subtitle={cityPulseSubtitle}
            loading={envLoading}
            className="h-full"
            headerRight={
              <InfoTooltip text="Top 5 most improved and top 5 most worsened neighborhoods by % change in the selected incident type compared to the prior period of the same length. Rates are normalized by neighborhood area." />
            }
          >
            <ChangeLeadersChart data={comparison} domain={bottomRowDomain} />
          </ChartCard>
        </div>
      </div>
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
          <ChartCard title="Incidents by Neighborhood" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
        <div className="lg:col-span-5">
          <ChartCard title="Category Breakdown" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7">
          <ChartCard title="AQI Trend" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
        <div className="lg:col-span-5">
          <ChartCard title="Incidents by Day & Hour" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Neighborhood Ranking" loading>
          <div className="h-48" />
        </ChartCard>
        <ChartCard title="Change Leaders" loading>
          <div className="h-48" />
        </ChartCard>
      </div>
    </PageShell>
  );
}
