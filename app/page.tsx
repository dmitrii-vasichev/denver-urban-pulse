import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { ChartCard } from "@/components/cards/chart-card";
import { NarrativeBlock } from "@/components/cards/narrative-block";

export default function CityPulsePage() {
  return (
    <PageShell
      title="City Pulse"
      subtitle="Crime, crashes, and 311 requests across Denver"
    >
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          title="Crime Incidents"
          tag="30D"
          value={0}
          deltaPercent={0}
          color="#2458C6"
          loading
        />
        <KpiCard
          title="Traffic Crashes"
          tag="30D"
          value={0}
          deltaPercent={0}
          color="#D97904"
          loading
        />
        <KpiCard
          title="311 Requests"
          tag="30D"
          value={0}
          deltaPercent={0}
          color="#198754"
          loading
        />
      </div>

      {/* Hero Row — 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <ChartCard title="Incident Trends" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <NarrativeBlock
            title="City Pulse Today"
            content=""
            loading
          />
        </div>
      </div>

      {/* Lower Analytics — 2×2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard title="Category Breakdown" loading>
          <div className="h-48" />
        </ChartCard>
        <ChartCard title="Time Heatmap" loading>
          <div className="h-48" />
        </ChartCard>
        <ChartCard title="Neighborhood Map" loading>
          <div className="h-48" />
        </ChartCard>
        <ChartCard title="Top Neighborhoods" loading>
          <div className="h-48" />
        </ChartCard>
      </div>
    </PageShell>
  );
}
