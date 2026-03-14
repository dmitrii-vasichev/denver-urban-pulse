import { PageShell } from "@/components/layout/page-shell";
import { KpiCard } from "@/components/cards/kpi-card";
import { ChartCard } from "@/components/cards/chart-card";
import { NarrativeBlock } from "@/components/cards/narrative-block";

export default function EnvironmentPage() {
  return (
    <PageShell
      title="Environment & Neighborhoods"
      subtitle="Air quality and neighborhood analytics"
    >
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          title="Air Quality Index"
          tag="Current"
          value={0}
          color="#0B4F8C"
          loading
        />
        <KpiCard
          title="Safest Neighborhood"
          tag="30D"
          value={0}
          color="#198754"
          loading
        />
        <KpiCard
          title="Most Active Area"
          tag="30D"
          value={0}
          color="#D97904"
          loading
        />
      </div>

      {/* Hero Row — 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3">
          <ChartCard title="AQI Trend" loading>
            <div className="h-48" />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <NarrativeBlock
            title="Environment Today"
            content=""
            loading
          />
        </div>
      </div>

      {/* Lower Analytics — 2×2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCard title="Neighborhood Rankings" loading>
          <div className="h-48" />
        </ChartCard>
        <ChartCard title="Neighborhood Comparison" loading>
          <div className="h-48" />
        </ChartCard>
      </div>
    </PageShell>
  );
}
