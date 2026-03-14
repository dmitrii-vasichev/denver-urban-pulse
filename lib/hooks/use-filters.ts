"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { TimeWindow } from "@/lib/types";

export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const timeWindow = (searchParams.get("tw") ?? "30d") as TimeWindow;
  const neighborhood = searchParams.get("nb") ?? "all";

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "30d" && key === "tw") {
        params.delete(key);
      } else if (value === "all" && key === "nb") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, router, pathname]
  );

  const setTimeWindow = useCallback(
    (tw: TimeWindow) => setFilter("tw", tw),
    [setFilter]
  );

  const setNeighborhood = useCallback(
    (nb: string) => setFilter("nb", nb),
    [setFilter]
  );

  return { timeWindow, neighborhood, setTimeWindow, setNeighborhood };
}
