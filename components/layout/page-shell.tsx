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
      <footer className="px-3 py-4 md:px-4 xl:px-5 text-center text-[11px] text-[#627D98]">
        <span>Built by </span>
        <a href="https://dmitrii-vasichev.com" target="_blank" rel="noopener noreferrer" className="text-[#0B4F8C] hover:underline">
          Dmitrii Vasichev
        </a>
        <span className="mx-1.5">·</span>
        <a href="https://github.com/dmitrii-vasichev" target="_blank" rel="noopener noreferrer" className="text-[#627D98] hover:text-[#0B4F8C]">
          GitHub
        </a>
        <span className="mx-1.5">·</span>
        <a href="https://www.linkedin.com/in/dmitrii-vasichev" target="_blank" rel="noopener noreferrer" className="text-[#627D98] hover:text-[#0B4F8C]">
          LinkedIn
        </a>
        <span className="mx-1.5">·</span>
        <a href="https://t.me/dmitrii_vasichev" target="_blank" rel="noopener noreferrer" className="text-[#627D98] hover:text-[#0B4F8C]">
          Telegram
        </a>
      </footer>
    </div>
  );
}
