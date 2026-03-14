"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { ChartPoint } from "@/lib/types";

interface SparklineProps {
  data: ChartPoint[];
  color: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  data,
  color,
  width = 80,
  height = 28,
}: SparklineProps) {
  if (data.length === 0) return null;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
