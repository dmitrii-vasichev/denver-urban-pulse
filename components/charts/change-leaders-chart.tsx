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
import type { ComparisonRow, IncidentDomain } from "@/lib/types";

interface ChangeLeadersChartProps {
  data: ComparisonRow[];
  domain: IncidentDomain;
}

interface LeaderEntry {
  neighborhood: string;
  delta: number;
  isMostImproved?: boolean;
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

export function computeLeaders(data: ComparisonRow[], domain: IncidentDomain): LeaderEntry[] {
  const withDelta = data
    .map((r) => ({
      neighborhood: r.neighborhood,
      delta: domain === "crime" ? (r.crimeDeltaPct ?? 0) : (r.crashDeltaPct ?? 0),
    }))
    .filter((r) => isFinite(r.delta));

  const sorted = [...withDelta].sort((a, b) => a.delta - b.delta);
  const best = sorted.slice(0, 5);
  const worst = sorted.slice(-5).reverse();

  const combined = [...worst, ...best];
  const seen = new Set<string>();
  const result = combined.filter((r) => {
    if (seen.has(r.neighborhood)) return false;
    seen.add(r.neighborhood);
    return true;
  });

  // Mark the entry with the lowest (most negative) delta
  const mostImproved = result.reduce<LeaderEntry | null>(
    (best, r) => (r.delta < 0 && (!best || r.delta < best.delta) ? r : best),
    null
  );
  if (mostImproved) mostImproved.isMostImproved = true;

  return result;
}

export function ChangeLeadersChart({ data, domain }: ChangeLeadersChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No change data available
      </div>
    );
  }

  const leaders = computeLeaders(data, domain);
  const mostImprovedName = leaders.find((l) => l.isMostImproved)?.neighborhood;

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
          tick={(props: Record<string, unknown>) => {
            const x = Number(props.x);
            const y = Number(props.y);
            const value = String((props.payload as { value: string })?.value ?? "");
            const isMI = value === mostImprovedName;
            return (
              <text
                x={x}
                y={y}
                textAnchor="end"
                fontSize={9}
                fill={isMI ? "#0D6E3F" : "#627D98"}
                fontWeight={isMI ? 700 : 400}
                dominantBaseline="central"
              >
                <title>{value}</title>
                {isMI ? "★ " : ""}{truncate(value, 14)}
              </text>
            );
          }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <ReferenceLine x={0} stroke="#DDE3EA" />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="delta" isAnimationActive={false} radius={[4, 4, 4, 4]}>
          {leaders.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isMostImproved ? "#0D6E3F" : entry.delta <= 0 ? "#198754" : "#DC3545"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
