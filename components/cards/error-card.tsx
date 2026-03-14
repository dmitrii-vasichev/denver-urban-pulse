"use client";

import { AlertTriangle } from "lucide-react";

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="rounded-[14px] bg-white border border-[#DDE3EA] border-l-4 border-l-[#DC3545] p-6 shadow-[0_2px_6px_#102A4310]">
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={20}
          className="text-[#DC3545] shrink-0 mt-0.5"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-[#102A43]">
            Failed to load data
          </p>
          <p className="text-xs text-[#627D98] mt-1">{message}</p>
          <button
            onClick={onRetry}
            className="mt-3 px-4 py-1.5 rounded-full bg-[#102A43] text-white text-xs font-semibold hover:bg-[#243B53] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
