"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { NeighborhoodRow, IncidentDomain } from "@/lib/types";

interface NeighborhoodRankingChartProps {
  data: NeighborhoodRow[];
  domain: IncidentDomain;
}

export interface RankingEntry {
  neighborhood: string;
  count: number;
  isTop?: boolean;
}

const DOMAIN_COLORS: Record<IncidentDomain, { strong: string; normal: string }> = {
  crime: { strong: "#1A3F8F", normal: "#2458C6" },
  crashes: { strong: "#A65E00", normal: "#D97904" },
};

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RankingEntry }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 shadow-md">
      <p className="text-[11px] font-semibold text-[#102A43] mb-1">
        {entry.neighborhood}
      </p>
      <p className="text-[10px] text-[#52667A]">
        Incidents: {entry.count.toLocaleString()}
      </p>
    </div>
  );
}

export function computeRanking(
  data: NeighborhoodRow[],
  domain: IncidentDomain,
): RankingEntry[] {
  const field = domain === "crime" ? "crimeCount" : "crashCount";

  const sorted: RankingEntry[] = [...data]
    .map((r) => ({ neighborhood: r.neighborhood, count: r[field] }))
    .filter((r) => r.count != null && isFinite(r.count))
    .sort((a, b) => b.count - a.count);

  if (sorted.length === 0) return [];

  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();

  // Deduplicate in case there are fewer than 10 neighborhoods
  const combined = [...top5, ...bottom5];
  const seen = new Set<string>();
  const result = combined.filter((r) => {
    if (seen.has(r.neighborhood)) return false;
    seen.add(r.neighborhood);
    return true;
  });

  // Mark the highest-count entry
  if (result.length > 0) {
    result[0].isTop = true;
  }

  return result;
}

export function NeighborhoodRankingChart({
  data,
  domain,
}: NeighborhoodRankingChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No ranking data available
      </div>
    );
  }

  const ranking = computeRanking(data, domain);
  const colors = DOMAIN_COLORS[domain];
  const topName = ranking.find((r) => r.isTop)?.neighborhood;

  if (ranking.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No ranking data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={ranking}
        layout="vertical"
        margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#627D98" }}
          axisLine={{ stroke: "#DDE3EA" }}
          tickLine={false}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <YAxis
          type="category"
          dataKey="neighborhood"
          width={90}
          tick={(props: Record<string, unknown>) => {
            const x = Number(props.x);
            const y = Number(props.y);
            const value = String(
              (props.payload as { value: string })?.value ?? "",
            );
            const isTopEntry = value === topName;
            return (
              <text
                x={x}
                y={y}
                textAnchor="end"
                fontSize={9}
                fill={isTopEntry ? colors.strong : "#627D98"}
                fontWeight={isTopEntry ? 700 : 400}
                dominantBaseline="central"
              >
                <title>{value}</title>
                {isTopEntry ? "▲ " : ""}
                {truncate(value, 14)}
              </text>
            );
          }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" isAnimationActive={false} radius={[4, 4, 4, 4]}>
          {ranking.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isTop ? colors.strong : colors.normal}
              opacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
