"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { NeighborhoodRow } from "@/lib/types";
import { formatNumber } from "@/lib/format";

interface NeighborhoodRankingChartProps {
  data: NeighborhoodRow[];
}

const SERIES = [
  { key: "crimeCount" as const, name: "Crime", color: "#2458C6" },
  { key: "crashCount" as const, name: "Crashes", color: "#D97904" },
  { key: "requests311Count" as const, name: "311", color: "#198754" },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div className="rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 shadow-md">
      <p className="text-[11px] font-semibold text-[#102A43] mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-[10px] text-[#52667A]">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
      <p className="text-[10px] font-medium text-[#102A43] mt-1 pt-1 border-t border-[#EEF3F8]">
        Total: {formatNumber(total)}
      </p>
    </div>
  );
}

export function NeighborhoodRankingChart({ data }: NeighborhoodRankingChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No neighborhood data available
      </div>
    );
  }

  // Sort by total descending, take top 10
  const sorted = [...data]
    .map((d) => ({
      ...d,
      total: d.crimeCount + d.crashCount + d.requests311Count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 9, fill: "#627D98" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <YAxis
          type="category"
          dataKey="neighborhood"
          width={100}
          tick={{ fontSize: 9, fill: "#52667A" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10, color: "#52667A" }}
        />
        {SERIES.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId="stack"
            fill={s.color}
            isAnimationActive={false}
            radius={s.key === "requests311Count" ? [0, 2, 2, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
