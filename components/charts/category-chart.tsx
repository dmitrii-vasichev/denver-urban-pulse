"use client";

import { useState, useCallback } from "react";
import type { CategoryBreakdown, CategoryTrends, ChartPoint } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { Sparkline } from "@/components/ui/sparkline";

interface CategoryChartProps {
  data: Record<string, CategoryBreakdown[]>;
  trends?: CategoryTrends;
}

interface TooltipState {
  domain: string;
  color: string;
  category: string;
  count: number;
  percent: number;
  sparkline: ChartPoint[];
  x: number;
  y: number;
}

const DOMAINS = [
  { key: "crime", label: "Crime", color: "#2458C6" },
  { key: "crashes", label: "Crashes", color: "#D97904" },
  { key: "requests311", label: "311 Requests", color: "#198754" },
];

export function CategoryChart({ data, trends = {} }: CategoryChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleMouseEnter = useCallback(
    (
      e: React.MouseEvent,
      domain: { key: string; color: string },
      item: CategoryBreakdown
    ) => {
      const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();

      setTooltip({
        domain: domain.key,
        color: domain.color,
        category: item.category,
        count: item.count,
        percent: item.percent,
        sparkline: trends[domain.key]?.[item.category] ?? [],
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top,
      });
    },
    [trends]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const hasDomains = DOMAINS.some((d) => data[d.key]?.length);

  if (!hasDomains) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No category data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {DOMAINS.map((domain) => {
        const items = data[domain.key];
        if (!items?.length) return null;

        const maxCount = Math.max(...items.map((i) => i.count));

        // If domain has only one category, show a summary line instead of a chart
        if (items.length === 1) {
          const item = items[0];
          return (
            <div key={domain.key}>
              <p className="text-[10px] font-semibold text-[#102A43] mb-1.5">
                {domain.label}
              </p>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[9px] text-[#52667A]">Total</span>
                <span className="text-[11px] font-medium text-[#102A43]">
                  {formatNumber(item.count)}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div key={domain.key}>
            <p className="text-[10px] font-semibold text-[#102A43] mb-1.5">
              {domain.label}
            </p>
            <div className="space-y-1">
              {items.slice(0, 6).map((item) => (
                <div
                  key={item.category}
                  className="flex items-center gap-2 cursor-default"
                  onMouseEnter={(e) => handleMouseEnter(e, domain, item)}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="text-[9px] text-[#52667A] w-24 truncate shrink-0 text-right" title={item.category}>
                    {item.category}
                  </span>
                  <div className="flex-1 h-3.5 bg-[#EEF3F8] rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all"
                      style={{
                        width: `${(item.count / maxCount) * 100}%`,
                        backgroundColor: domain.color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-[#627D98] w-12 shrink-0">
                    {formatNumber(item.count)}
                  </span>
                  <span className="text-[9px] text-[#627D98] w-8 shrink-0">
                    {item.percent.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none animate-fade-in"
          style={{
            left: `clamp(8px, ${tooltip.x - 100}px, calc(100vw - 208px))`,
            top: `${tooltip.y - 8}px`,
            transform: "translateY(-100%)",
          }}
        >
          <div className="bg-[#102A43] text-white rounded-lg shadow-lg px-3 py-2.5 w-[200px]">
            <p className="text-[11px] font-medium leading-tight mb-1">
              {tooltip.category}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-white/70 mb-2">
              <span>{formatNumber(tooltip.count)}</span>
              <span className="text-white/40">·</span>
              <span>{tooltip.percent.toFixed(1)}%</span>
            </div>
            {tooltip.sparkline.length > 1 && (
              <Sparkline
                data={tooltip.sparkline}
                color={tooltip.color}
                width={176}
                height={40}
                interactive={false}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
