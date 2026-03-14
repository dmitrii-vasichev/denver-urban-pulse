"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const DenverMapDynamic = dynamic(
  () => import("./denver-map").then((m) => m.DenverMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full min-h-[300px] rounded-lg bg-[#EEF3F8] flex items-center justify-center">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ),
  }
);
