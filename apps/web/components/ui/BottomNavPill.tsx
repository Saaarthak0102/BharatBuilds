"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LuHouse, LuMap, LuCalendar, LuUser } from "react-icons/lu";

export function BottomNavPill() {
  const pathname = usePathname();

  const links = [
    { href: "/", icon: LuHouse, label: "Home" },
    { href: "/map", icon: LuMap, label: "Map" },
    { href: "/farmer/field", icon: LuCalendar, label: "Planner" },
    { href: "/profile", icon: LuUser, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-sticky)] md:hidden">
      <nav className="flex items-center gap-1 rounded-full bg-[var(--bg-2)]/90 p-2 shadow-lg backdrop-blur-md border border-[var(--border)]">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const Icon = link.icon;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex h-12 w-16 flex-col items-center justify-center rounded-full transition-colors duration-300",
                isActive ? "text-[var(--text-hi)]" : "text-[var(--text-mid)] hover:text-[var(--text-hi)]"
              )}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-full bg-[var(--bg-3)] shadow-inner" />
              )}
              <span className="relative z-10">
                <Icon className="h-5 w-5" />
              </span>
              {isActive && (
                <span className="relative z-10 mt-1 text-[10px] font-medium tracking-wide">
                  {link.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
