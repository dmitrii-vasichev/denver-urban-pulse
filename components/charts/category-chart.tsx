"use client";

import type { CategoryBreakdown } from "@/lib/types";
import { formatNumber } from "@/lib/format";

interface CategoryChartProps {
  data: Record<string, CategoryBreakdown[]>;
}

const DOMAINS = [
  { key: "crime", label: "Crime", color: "#2458C6" },
  { key: "crashes", label: "Crashes", color: "#D97904" },
  { key: "requests311", label: "311 Requests", color: "#198754" },
];

export function CategoryChart({ data }: CategoryChartProps) {
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
                <div key={item.category} className="flex items-center gap-2">
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
    </div>
  );
}
