"use client";

import { usePathname } from "next/navigation";
import {
  BarChart3,
  Leaf,
  Wrench,
  FileText,
} from "lucide-react";
import { SidebarItem } from "./sidebar-item";

const NAV_ITEMS = [
  { href: "/", label: "City Pulse", icon: BarChart3, disabled: false },
  {
    href: "/environment",
    label: "Environment & Neighborhoods",
    icon: Leaf,
    disabled: false,
  },
  { href: "/services", label: "Services", icon: Wrench, disabled: true },
  {
    href: "/daily-brief",
    label: "Daily Brief",
    icon: FileText,
    disabled: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden xl:flex flex-col w-60 shrink-0 border-r border-[#E6E9EE] bg-white h-screen sticky top-0">
      <div className="px-5 py-5">
        <h1 className="text-base font-bold text-[#102A43] leading-tight">
          Denver Urban Pulse
        </h1>
        <p className="text-[10px] text-[#627D98] mt-0.5">
          Live city data dashboard
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon size={18} strokeWidth={1.8} />}
            active={
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            }
            disabled={item.disabled}
          />
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-[#E6E9EE]">
        <p className="text-[10px] text-[#9FB3C8]">
          Data refreshed daily at 06:00 UTC
        </p>
      </div>
    </aside>
  );
}
