"use client";

import { Suspense } from "react";
import { TimeWindowFilter } from "./time-window-filter";
import { NeighborhoodFilter } from "./neighborhood-filter";
import { useFilters } from "@/lib/hooks/use-filters";
import { formatDateShort } from "@/lib/format";
import type { DomainFreshness } from "@/lib/types";

interface HeaderProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string | null;
  domainFreshness?: DomainFreshness | null;
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

const DOMAIN_LABELS: { key: keyof DomainFreshness; label: string }[] = [
  { key: "crime", label: "Crime" },
  { key: "crashes", label: "Crashes" },
  { key: "requests311", label: "311" },
  { key: "aqi", label: "AQI" },
];

function HeaderInner({ lastUpdated, domainFreshness }: HeaderProps) {
  const { timeWindow, neighborhood, setTimeWindow, setNeighborhood } =
    useFilters();

  const hasFreshness = domainFreshness && DOMAIN_LABELS.some((d) => domainFreshness[d.key]);

  return (
    <header className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-3 py-3 md:px-4 xl:px-5 bg-white border-b border-[#E6E9EE]">
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
                    .map((d) => `${d.label} ${formatDateShort(domainFreshness![d.key]!)}`)
                    .join(" · ")}
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
        <header className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 md:px-4 xl:px-5 bg-white border-b border-[#E6E9EE]">
          <h1 className="text-base font-bold text-[#102A43]">Denver Urban Pulse</h1>
        </header>
      }
    >
      <HeaderInner {...props} />
    </Suspense>
  );
}
