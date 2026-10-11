"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PillButton } from "./PillButton";
import { Logo } from "@/components/common/Logo";

export function TopBar() {
  const pathname = usePathname();
  
  return (
    <header className="sticky top-0 left-0 right-0 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[var(--bg-0)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo size={32} withWordmark priority href="/" />
          

        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--text-mid)] font-medium mr-2">
            <button className="interactive-quiet">EN</button>
            <span className="text-[var(--border-strong)]">|</span>
            <button className="interactive-quiet font-hi">हिं</button>
            <span className="text-[var(--border-strong)]">|</span>
            <button className="interactive-quiet font-pa">ਪੰ</button>
          </div>
          
          <div className="hidden sm:flex items-center gap-3">
            <PillButton href="/login" variant="glass" size="md">Log in</PillButton>
            <PillButton href="/signup" variant="primary-silver" size="md">Sign up</PillButton>
          </div>
          
          <button className="md:hidden p-2 text-[var(--text-mid)] interactive-quiet">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
