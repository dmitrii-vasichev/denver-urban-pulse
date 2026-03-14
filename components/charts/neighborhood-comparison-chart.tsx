"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ComparisonRow } from "@/lib/types";

interface NeighborhoodComparisonChartProps {
  data: ComparisonRow[];
}

const METRICS = [
  { key: "crimeRate" as const, name: "Crime", color: "#2458C6" },
  { key: "crashRate" as const, name: "Crashes", color: "#D97904" },
  { key: "requests311Rate" as const, name: "311", color: "#198754" },
];

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

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
  return (
    <div className="rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 shadow-md">
      <p className="text-[11px] font-semibold text-[#102A43] mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-[10px] text-[#52667A]">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {entry.value.toFixed(1)}
        </p>
      ))}
    </div>
  );
}

export function NeighborhoodComparisonChart({
  data,
}: NeighborhoodComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No comparison data available
      </div>
    );
  }

  const sorted = [...data]
    .sort(
      (a, b) =>
        b.crimeRate +
        b.crashRate +
        b.requests311Rate -
        (a.crimeRate + a.crashRate + a.requests311Rate)
    )
    .slice(0, 8);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={sorted}
        margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" />
        <XAxis
          dataKey="neighborhood"
          tickFormatter={(v: string) => truncate(v, 10)}
          tick={{ fontSize: 9, fill: "#627D98" }}
          axisLine={{ stroke: "#DDE3EA" }}
          tickLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#627D98" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10, color: "#52667A" }}
        />
        {METRICS.map((m) => (
          <Bar
            key={m.key}
            dataKey={m.key}
            name={m.name}
            fill={m.color}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
