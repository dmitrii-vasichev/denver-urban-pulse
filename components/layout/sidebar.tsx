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
    <aside className="hidden lg:flex flex-col shrink-0 border-r border-[#E6E9EE] bg-white h-screen sticky top-0 w-16 xl:w-60">
      {/* Logo — icon only on lg, full on xl */}
      <div className="px-3 py-5 xl:px-5">
        <h1 className="hidden xl:block text-base font-bold text-[#102A43] leading-tight">
          Denver Urban Pulse
        </h1>
        <p className="hidden xl:block text-[10px] text-[#627D98] mt-0.5">
          Live city data dashboard
        </p>
        {/* Collapsed: show DUP initials */}
        <span className="xl:hidden text-sm font-bold text-[#102A43] block text-center">
          DUP
        </span>
      </div>

      <nav className="flex-1 px-1.5 xl:px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <span key={item.href}>
            {/* Collapsed sidebar item (lg only) */}
            <span className="xl:hidden">
              <SidebarItem
                href={item.href}
                label={item.label}
                icon={<item.icon size={18} strokeWidth={1.8} />}
                active={
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                }
                disabled={item.disabled}
                collapsed
              />
            </span>
            {/* Full sidebar item (xl+) */}
            <span className="hidden xl:block">
              <SidebarItem
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
            </span>
          </span>
        ))}
      </nav>

      <div className="hidden xl:block px-5 py-4 border-t border-[#E6E9EE]">
        <p className="text-[10px] text-[#9FB3C8]">
          Refreshed daily at 06:00 UTC
        </p>
        <p className="text-[10px] text-[#9FB3C8]">
          Crime & crash data delayed 5–7 days
        </p>
      </div>
    </aside>
  );
}
