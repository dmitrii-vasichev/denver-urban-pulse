"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatNumber, formatDateShort } from "@/lib/format";
import type { ChartPoint } from "@/lib/types";

interface SparklineProps {
  data: ChartPoint[];
  color: string;
  width?: number | string;
  height?: number;
  label?: string;
  interactive?: boolean;
}

function SparklineTooltip({
  active,
  payload,
  label: metricLabel,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const date = formatDateShort(point.payload?.date);
  const value = formatNumber(point.value as number);
  return (
    <div className="rounded-lg bg-[#102A43] px-2.5 py-1.5 text-[11px] text-white shadow-lg">
      <span className="font-medium">{date}</span>
      <span className="mx-1 text-white/50">·</span>
      <span>{value} {metricLabel ?? "incidents"}</span>
    </div>
  );
}

export function Sparkline({
  data,
  color,
  width = "100%",
  height = 36,
  label,
  interactive = true,
}: SparklineProps) {
  if (data.length === 0) return null;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 2, bottom: 0, left: 2 }}
        >
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          {interactive && (
            <Tooltip
              content={<SparklineTooltip label={label} />}
              cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1 }}
              isAnimationActive={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color})`}
            isAnimationActive={false}
            activeDot={{
              r: 3,
              fill: color,
              stroke: "#fff",
              strokeWidth: 1.5,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
