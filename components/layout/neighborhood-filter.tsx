"use client";

import { useEffect, useState } from "react";

interface NeighborhoodFilterProps {
  value: string;
  onChange: (nb: string) => void;
}

export function NeighborhoodFilter({
  value,
  onChange,
}: NeighborhoodFilterProps) {
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/shared/neighborhoods")
      .then((r) => r.json())
      .then((body) => {
        if (body.data) {
          setNeighborhoods(body.data.map((n: { name: string }) => n.name));
        }
      })
      .catch(() => {
        // Silently fail — dropdown will show only "All Neighborhoods"
      });
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full bg-[#EEF4FA] border border-[#C7D5E6] px-3 py-1.5 text-xs font-medium text-[#52667A] cursor-pointer hover:bg-[#E0E8F0] appearance-none pr-7 min-w-0 max-w-full truncate"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2352667A' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
      }}
    >
      <option value="all">All Neighborhoods</option>
      {neighborhoods.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
