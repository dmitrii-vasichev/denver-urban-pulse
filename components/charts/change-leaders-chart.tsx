"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ComparisonRow } from "@/lib/types";

interface ChangeLeadersChartProps {
  data: ComparisonRow[];
}

interface LeaderEntry {
  neighborhood: string;
  delta: number;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: LeaderEntry }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const sign = entry.delta > 0 ? "+" : "";
  return (
    <div className="rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 shadow-md">
      <p className="text-[11px] font-semibold text-[#102A43] mb-1">
        {entry.neighborhood}
      </p>
      <p className="text-[10px] text-[#52667A]">
        Change: {sign}{entry.delta.toFixed(1)}%
      </p>
    </div>
  );
}

function computeLeaders(data: ComparisonRow[]): LeaderEntry[] {
  const withDelta = data
    .map((r) => ({
      neighborhood: r.neighborhood,
      delta:
        ((r.crimeDeltaPct ?? 0) +
          (r.crashDeltaPct ?? 0) +
          (r.requests311DeltaPct ?? 0)) /
        3,
    }))
    .filter((r) => isFinite(r.delta));

  const sorted = [...withDelta].sort((a, b) => a.delta - b.delta);
  const best = sorted.slice(0, 5);
  const worst = sorted.slice(-5).reverse();

  const combined = [...worst, ...best];
  const seen = new Set<string>();
  return combined.filter((r) => {
    if (seen.has(r.neighborhood)) return false;
    seen.add(r.neighborhood);
    return true;
  });
}

export function ChangeLeadersChart({ data }: ChangeLeadersChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No change data available
      </div>
    );
  }

  const leaders = computeLeaders(data);

  if (leaders.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No change data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={leaders}
        layout="vertical"
        margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#627D98" }}
          axisLine={{ stroke: "#DDE3EA" }}
          tickLine={false}
          tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
        />
        <YAxis
          type="category"
          dataKey="neighborhood"
          width={90}
          tickFormatter={(v: string) => truncate(v, 14)}
          tick={{ fontSize: 9, fill: "#627D98" }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine x={0} stroke="#DDE3EA" />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="delta" isAnimationActive={false} radius={[2, 2, 2, 2]}>
          {leaders.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.delta <= 0 ? "#198754" : "#DC3545"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
