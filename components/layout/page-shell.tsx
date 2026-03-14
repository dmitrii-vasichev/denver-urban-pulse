"use client";

import { Header } from "./header";

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function PageShell({ title, subtitle, children }: PageShellProps) {
  return (
    <div className="flex-1 min-h-screen bg-[#F4F6F8] overflow-auto">
      <Header title={title} subtitle={subtitle} />
      <div className="px-4 pb-6 xl:px-5 space-y-4">{children}</div>
    </div>
  );
}
