"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { Sparkline } from "@/components/ui/sparkline";
import { formatNumber } from "@/lib/format";
import type { ChartPoint } from "@/lib/types";

interface KpiCardProps {
  title: string;
  tag?: string;
  secondaryTag?: string;
  value: number | null | undefined;
  delta?: number;
  deltaPercent?: number;
  sparklineData?: ChartPoint[];
  sparklineLabel?: string;
  insight?: string;
  color: string;
  loading?: boolean;
  className?: string;
}

export function KpiCard({
  title,
  tag,
  secondaryTag,
  value,
  deltaPercent,
  sparklineData = [],
  sparklineLabel,
  insight,
  color,
  loading,
  className,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className={`rounded-[14px] bg-white border border-[#DDE3EA] p-3.5 shadow-[0_2px_6px_#102A4310] ${className ?? ""}`}>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
        <div className="flex items-end gap-3">
          <div className="shrink-0">
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-14" />
          </div>
          <Skeleton className="h-12 flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[14px] bg-white border border-[#DDE3EA] p-3.5 shadow-[0_2px_6px_#102A4310] ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-[#52667A] uppercase tracking-wide">
          {title}
        </span>
        {(tag || secondaryTag) && (
          <span className="text-[10px] text-[#627D98]">
            {secondaryTag ?? tag}
          </span>
        )}
      </div>

      <div className="flex items-end gap-3">
        <div className="shrink-0">
          <div className="text-[34px] font-bold text-[#102A43] leading-none mb-1">
            {formatNumber(value)}
          </div>
          <DeltaBadge value={deltaPercent} />
        </div>
        <div className="min-w-0 flex-1 self-center">
          <Sparkline
            data={sparklineData}
            color={color}
            metricLabel={sparklineLabel}
            height={48}
          />
        </div>
      </div>

      {insight && (
        <p className="text-[10px] text-[#627D98] mt-1.5 leading-tight line-clamp-1">
          {insight}
        </p>
      )}
    </div>
  );
}
