"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import type { AqiDailyPoint } from "@/lib/types";
import { formatDateShort } from "@/lib/format";

interface AqiTrendChartProps {
  data: AqiDailyPoint[];
}

const AQI_BANDS = [
  { y1: 0, y2: 50, fill: "#22c55e", label: "Good" },
  { y1: 50, y2: 100, fill: "#eab308", label: "Moderate" },
  { y1: 100, y2: 150, fill: "#f97316", label: "USG" },
  { y1: 150, y2: 300, fill: "#ef4444", label: "Unhealthy" },
];

function aqiCategory(value: number): string {
  if (value <= 50) return "Good";
  if (value <= 100) return "Moderate";
  if (value <= 150) return "Unhealthy for Sensitive Groups";
  if (value <= 200) return "Unhealthy";
  if (value <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const aqi = payload.find((p) => p.dataKey === "aqiMax");
  const value = aqi?.value ?? 0;
  return (
    <div className="rounded-lg border border-[#DDE3EA] bg-white px-3 py-2 shadow-md">
      <p className="text-[11px] font-semibold text-[#102A43] mb-1">
        {formatDateShort(label)}
      </p>
      <p className="text-[10px] text-[#52667A]">
        AQI: <span className="font-semibold text-[#102A43]">{value}</span>
      </p>
      <p className="text-[10px] text-[#627D98]">{aqiCategory(value)}</p>
    </div>
  );
}

export function AqiTrendChart({ data }: AqiTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[11px] text-[#627D98]">
        No AQI data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        {AQI_BANDS.map((band) => (
          <ReferenceArea
            key={band.label}
            y1={band.y1}
            y2={band.y2}
            fill={band.fill}
            fillOpacity={0.08}
          />
        ))}
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
          domain={[0, (max: number) => Math.max(max + 10, 100)]}
          tick={{ fontSize: 10, fill: "#627D98" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="aqiMax"
          name="AQI"
          stroke="#0B4F8C"
          strokeWidth={2}
          fill="#0B4F8C"
          fillOpacity={0.1}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
