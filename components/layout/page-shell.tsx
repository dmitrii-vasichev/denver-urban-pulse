"use client";

import { Header } from "./header";

interface PageShellProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string | null;
  effectiveThrough?: string | null;
  children: React.ReactNode;
}

export function PageShell({ title, subtitle, lastUpdated, effectiveThrough, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <Header title={title} subtitle={subtitle} lastUpdated={lastUpdated} effectiveThrough={effectiveThrough} />
      <div className="px-3 pb-6 md:px-4 xl:px-5 space-y-4">{children}</div>
    </div>
  );
}
