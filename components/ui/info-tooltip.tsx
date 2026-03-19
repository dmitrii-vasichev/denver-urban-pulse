"use client";

import { Info } from "lucide-react";

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        aria-label="Show chart info"
        className="flex items-center justify-center w-5 h-5 rounded-full text-[#627D98] hover:text-[#52667A] hover:bg-[#EEF3F8] transition-colors"
      >
        <Info size={14} strokeWidth={2} />
      </button>
      <div
        role="tooltip"
        className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-0 top-full mt-1.5 z-50 w-72 rounded-lg border border-[#DDE3EA] bg-white px-3 py-2.5 shadow-md text-[10px] leading-relaxed text-[#52667A] pointer-events-none"
      >
        {text}
      </div>
    </div>
  );
}
