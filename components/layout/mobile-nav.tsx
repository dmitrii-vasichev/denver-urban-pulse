"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, BarChart3, Leaf, Wrench, FileText } from "lucide-react";
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

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-[#102A43] hover:bg-[#F4F6F8] rounded-lg"
        aria-label="Open navigation"
      >
        <Menu size={22} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4">
              <h1 className="text-base font-bold text-[#102A43]">
                Denver Urban Pulse
              </h1>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-[#627D98] hover:text-[#102A43]"
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <div key={item.href} onClick={() => !item.disabled && setOpen(false)}>
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
                </div>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
