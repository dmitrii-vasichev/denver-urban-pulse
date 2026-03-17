"use client";

import { Header } from "./header";
import type { DomainFreshness } from "@/lib/types";

interface PageShellProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string | null;
  domainFreshness?: DomainFreshness | null;
  children: React.ReactNode;
}

export function PageShell({ title, subtitle, lastUpdated, domainFreshness, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <Header title={title} subtitle={subtitle} lastUpdated={lastUpdated} domainFreshness={domainFreshness} />
      <div className="px-3 pb-6 md:px-4 xl:px-5 space-y-4">{children}</div>
    </div>
  );
}
