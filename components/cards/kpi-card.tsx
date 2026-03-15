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
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-[14px] bg-white border border-[#DDE3EA] p-3.5 shadow-[0_2px_6px_#102A4310]">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-14 mb-2" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-white border border-[#DDE3EA] p-3.5 shadow-[0_2px_6px_#102A4310]">
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

      <div className="flex items-end gap-2 mb-1">
        <span className="text-[34px] font-bold text-[#102A43] leading-none">
          {formatNumber(value)}
        </span>
        <div className="mb-1">
          <DeltaBadge value={deltaPercent} />
        </div>
      </div>

      <Sparkline
        data={sparklineData}
        color={color}
        label={sparklineLabel}
        height={40}
      />

      {insight && (
        <p className="text-[10px] text-[#627D98] mt-1.5 leading-tight line-clamp-1">
          {insight}
        </p>
      )}
    </div>
  );
}
