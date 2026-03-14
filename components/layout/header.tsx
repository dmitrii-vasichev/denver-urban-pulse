"use client";

import { Suspense } from "react";
import { MobileNav } from "./mobile-nav";
import { TimeWindowFilter } from "./time-window-filter";
import { NeighborhoodFilter } from "./neighborhood-filter";
import { useFilters } from "@/lib/hooks/use-filters";

interface HeaderProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string | null;
}

function HeaderInner({ title, subtitle, lastUpdated }: HeaderProps) {
  const { timeWindow, neighborhood, setTimeWindow, setNeighborhood } =
    useFilters();

  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 px-3 py-3 md:px-4 xl:px-5 xl:py-4">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <h1 className="text-lg font-bold text-[#102A43] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-[#627D98] mt-0.5">{subtitle}</p>
          )}
          {lastUpdated && (
            <p className="text-[10px] text-[#9FB3C8] mt-0.5">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
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
        <header className="flex items-center justify-between px-3 py-3 md:px-4 xl:px-5 xl:py-4">
          <h1 className="text-lg font-bold text-[#102A43]">{props.title}</h1>
        </header>
      }
    >
      <HeaderInner {...props} />
    </Suspense>
  );
}
