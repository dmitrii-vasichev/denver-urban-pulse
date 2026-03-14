"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  disabled?: boolean;
}

export function SidebarItem({
  href,
  label,
  icon,
  active,
  disabled,
}: SidebarItemProps) {
  if (disabled) {
    return (
      <span
        className={cn(
          "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium",
          "text-[#9FB3C8] cursor-not-allowed select-none"
        )}
        aria-disabled="true"
      >
        {icon}
        <span className="flex-1">{label}</span>
        <span className="rounded-full bg-[#EEF3F8] px-2 py-0.5 text-[10px] font-semibold text-[#9FB3C8]">
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-[#E9F2FF] text-[#0B4F8C] font-semibold"
          : "text-[#243B53] hover:bg-[#F4F6F8]"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
