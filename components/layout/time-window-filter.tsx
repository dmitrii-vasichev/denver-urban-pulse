"use client";

import { cn } from "@/lib/utils";
import type { TimeWindow } from "@/lib/types";

const OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
];

interface TimeWindowFilterProps {
  value: TimeWindow;
  onChange: (tw: TimeWindow) => void;
}

export function TimeWindowFilter({ value, onChange }: TimeWindowFilterProps) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
            value === opt.value
              ? "bg-[#102A43] text-white"
              : "bg-[#EEF4FA] text-[#52667A] border border-[#C7D5E6] hover:bg-[#E0E8F0]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
