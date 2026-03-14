"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TrendPoint } from "@/lib/types";
import { formatDateShort, formatNumber } from "@/lib/format";

interface TrendChartProps {
  data: TrendPoint[];
}

const SERIES = [
  { key: "crime" as const, name: "Crime", color: "#2458C6" },
  { key: "crashes" as const, name: "Crashes", color: "#D97904" },
  { key: "requests311" as const, name: "311 Requests", color: "#198754" },
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
  return (
    <div className="rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 shadow-md">
      <p className="text-[11px] font-semibold text-[#102A43] mb-1">
        {formatDateShort(label)}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-[10px] text-[#52667A]">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          tick={{ fontSize: 10, fill: "#627D98" }}
          axisLine={{ stroke: "#DDE3EA" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#627D98" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10, color: "#52667A" }}
        />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
