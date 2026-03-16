"use client";

import { useState, useMemo, useCallback } from "react";
import type { HeatmapCell } from "@/lib/types";

interface HeatmapChartProps {
  data: HeatmapCell[];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}:00`);
const COLOR_LIGHT = "#EEF3F8";

function interpolateColor(ratio: number): string {
  // Linear interpolation from COLOR_LIGHT to COLOR_DARK
  const r1 = 0xee, g1 = 0xf3, b1 = 0xf8;
  const r2 = 0x0b, g2 = 0x4f, b2 = 0x8c;
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `rgb(${r},${g},${b})`;
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  const [tooltip, setTooltip] = useState<{ day: number; hour: number; count: number; x: number; y: number } | null>(null);

  const { grid, maxCount } = useMemo(() => {
    const g: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
    let max = 0;
    for (const cell of data) {
      g[cell.hourOfDay][cell.dayOfWeek] = cell.count;
      if (cell.count > max) max = cell.count;
    }
    return { grid: g, maxCount: max };
  }, [data]);

  const handleMouseEnter = useCallback(
    (hour: number, day: number, count: number, e: React.MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const parent = (e.target as HTMLElement).closest("[data-heatmap]")?.getBoundingClientRect();
      if (parent) {
        setTooltip({
          day,
          hour,
          count,
          x: rect.left - parent.left + rect.width / 2,
          y: rect.top - parent.top - 4,
        });
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No heatmap data available
      </div>
    );
  }

  return (
    <div className="relative" data-heatmap>
      {/* Day labels (top) */}
      <div className="flex ml-10">
        {DAY_LABELS.map((d) => (
          <div key={d} className="flex-1 text-center text-[9px] text-[#627D98] pb-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex">
        {/* Hour labels (left) */}
        <div className="flex flex-col w-10 shrink-0">
          {HOUR_LABELS.map((h, i) => (
            <div
              key={h}
              className="flex items-center justify-end pr-1.5 text-[8px] text-[#627D98]"
              style={{ height: 10 }}
            >
              {i % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="flex-1 grid grid-cols-7 gap-px">
          {Array.from({ length: 24 }, (_, hour) =>
            Array.from({ length: 7 }, (_, day) => {
              const count = grid[hour][day];
              const ratio = maxCount > 0 ? count / maxCount : 0;
              return (
                <div
                  key={`${hour}-${day}`}
                  data-cell
                  className="rounded-[1px] cursor-pointer transition-opacity hover:opacity-80"
                  style={{
                    height: 10,
                    backgroundColor: count > 0 ? interpolateColor(ratio) : COLOR_LIGHT,
                  }}
                  onMouseEnter={(e) => handleMouseEnter(hour, day, count, e)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-md border border-[#DDE3EA] bg-white px-2 py-1 shadow-md -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="text-[10px] text-[#102A43] font-medium whitespace-nowrap">
            {DAY_LABELS[tooltip.day]} {HOUR_LABELS[tooltip.hour]} — Avg per week: {tooltip.count} incidents
          </p>
        </div>
      )}
    </div>
  );
}
