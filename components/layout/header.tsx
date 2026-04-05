"use client";

import { Suspense } from "react";
import { TimeWindowFilter } from "./time-window-filter";
import { NeighborhoodFilter } from "./neighborhood-filter";
import { useFilters } from "@/lib/hooks/use-filters";
import { formatDate, formatDateShort } from "@/lib/format";
import type { DomainFreshness, FreshnessSourceKey, SourceFreshness } from "@/lib/types";

interface HeaderProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string | null;
  domainFreshness?: DomainFreshness | null;
  sourceFreshness?: SourceFreshness[];
}

function formatPipelineDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";
}

const DOMAIN_LABELS: { key: keyof DomainFreshness; label: string; sourceKey: FreshnessSourceKey }[] = [
  { key: "crime", label: "Crime", sourceKey: "crime" },
  { key: "crashes", label: "Crashes", sourceKey: "crashes" },
  { key: "requests311", label: "311", sourceKey: "requests311" },
  { key: "aqi", label: "AQI", sourceKey: "aqi" },
];

function DomainFreshnessItem({
  label,
  dbDate,
  freshness,
}: {
  label: string;
  dbDate: string;
  freshness: SourceFreshness | undefined;
}) {
  const status = freshness?.status ?? "unknown";
  const hasTooltip = freshness != null;

  // Indicator glyph next to the label — silent when everything is fine,
  // info dot when the source itself lags, warning when our pipeline is behind.
  const indicator = (() => {
    if (status === "pipeline_behind") {
      return (
        <span
          aria-label="Pipeline behind upstream source"
          className="ml-0.5 inline-block w-1.5 h-1.5 rounded-full bg-[#D97904] align-middle"
        />
      );
    }
    if (status === "source_lag") {
      return (
        <span
          aria-label="Upstream source publishes with delay"
          className="ml-0.5 inline-block w-1.5 h-1.5 rounded-full bg-[#9FB3C8] align-middle"
        />
      );
    }
    return null;
  })();

  const tooltipBody = (() => {
    if (!freshness) return null;

    const dbLine = `In DB: ${formatDate(freshness.dbDate)}`;
    const sourceLine = `At source: ${formatDate(freshness.sourceDate)}`;

    let statusLine: React.ReactNode = null;
    if (status === "ok") {
      statusLine = (
        <span className="text-[#198754]">✓ Up to date</span>
      );
    } else if (status === "source_lag") {
      const age = freshness.sourceAgeDays;
      statusLine = (
        <span className="text-[#627D98]">
          ⓘ Source publishes with {age != null ? `${age}d` : "a"} delay — pipeline is fine
        </span>
      );
    } else if (status === "pipeline_behind") {
      const drift = freshness.driftDays;
      statusLine = (
        <span className="text-[#D97904] font-semibold">
          ⚠ Pipeline behind by {drift != null ? `${drift} days` : "several days"}
        </span>
      );
    } else {
      statusLine = (
        <span className="text-[#9FB3C8]">Freshness check pending</span>
      );
    }

    return (
      <div className="flex flex-col gap-0.5">
        <div className="font-semibold text-[#334E68]">{label}</div>
        <div>{dbLine}</div>
        <div>{sourceLine}</div>
        <div className="mt-0.5">{statusLine}</div>
      </div>
    );
  })();

  return (
    <span className="relative group inline-flex items-center">
      <span>
        {label}{" "}
        <span className="font-semibold text-[#627D98]">{formatDateShort(dbDate)}</span>
        {indicator}
      </span>
      {hasTooltip && (
        <div
          role="tooltip"
          className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-1.5 z-[800] w-60 rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 shadow-md text-[10px] leading-relaxed text-[#52667A] pointer-events-none"
        >
          {tooltipBody}
        </div>
      )}
    </span>
  );
}

function HeaderInner({ lastUpdated, domainFreshness, sourceFreshness }: HeaderProps) {
  const { timeWindow, neighborhood, setTimeWindow, setNeighborhood } =
    useFilters();

  const hasFreshness = domainFreshness && DOMAIN_LABELS.some((d) => domainFreshness[d.key]);

  // Index sourceFreshness by source key for O(1) lookup in the render loop
  const freshnessBySource = new Map<FreshnessSourceKey, SourceFreshness>();
  for (const f of sourceFreshness ?? []) {
    freshnessBySource.set(f.source, f);
  }

  return (
    <header className="sticky top-0 z-[700] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-3 py-3 md:px-4 xl:px-5 bg-white border-b border-[#E6E9EE]">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-[#102A43] leading-tight">
            Denver Urban Pulse
          </h1>
          {(lastUpdated || hasFreshness) && (
            <p className="text-[10px] text-[#9FB3C8] mt-0.5">
              {lastUpdated && <>Pipeline ran: {formatPipelineDate(lastUpdated)}</>}
              {lastUpdated && hasFreshness && <span className="mx-1">·</span>}
              {hasFreshness && (
                <>
                  Data through:{" "}
                  {DOMAIN_LABELS
                    .filter((d) => domainFreshness![d.key])
                    .map((d, i, arr) => (
                      <span key={d.key}>
                        <DomainFreshnessItem
                          label={d.label}
                          dbDate={domainFreshness![d.key]!}
                          freshness={freshnessBySource.get(d.sourceKey)}
                        />
                        {i < arr.length - 1 && <span className="mx-1">·</span>}
                      </span>
                    ))}
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
        <TimeWindowFilter value={timeWindow} onChange={setTimeWindow} />
        <NeighborhoodFilter value={neighborhood} onChange={setNeighborhood} />
      </div>
    </header>
  );
}

export function Header(props: HeaderProps) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-[700] flex items-center justify-between px-3 py-3 md:px-4 xl:px-5 bg-white border-b border-[#E6E9EE]">
          <h1 className="text-base font-bold text-[#102A43]">Denver Urban Pulse</h1>
        </header>
      }
    >
      <HeaderInner {...props} />
    </Suspense>
  );
}
