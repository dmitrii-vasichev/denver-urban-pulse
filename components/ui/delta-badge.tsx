import { cn } from "@/lib/utils";
import { formatDelta } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";

interface DeltaBadgeProps {
  value: number | null | undefined;
  className?: string;
}

export function DeltaBadge({ value, className }: DeltaBadgeProps) {
  if (value == null) return null;

  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        isPositive && "bg-[#198754]/10 text-[#198754]",
        isNegative && "bg-[#DC3545]/10 text-[#DC3545]",
        !isPositive && !isNegative && "bg-[#EEF3F8] text-[#627D98]",
        className
      )}
    >
      {isPositive && <TrendingUp size={10} />}
      {isNegative && <TrendingDown size={10} />}
      {formatDelta(value)}
    </span>
  );
}
