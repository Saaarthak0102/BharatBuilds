"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PillButton } from "./PillButton";

export function TopBar() {
  const pathname = usePathname();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[var(--bg-0)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif italic text-2xl tracking-tight text-[var(--text-hi)]">Saans</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-mid)]">
            <Link href="/#how-it-works" className="hover:text-[var(--text-hi)] transition-colors">How it works</Link>
            <Link href="/#farmers" className="hover:text-[var(--text-hi)] transition-colors">Farmers</Link>
            <Link href="/#citizens" className="hover:text-[var(--text-hi)] transition-colors">Citizens</Link>
            <Link href="/map" className="hover:text-[var(--text-hi)] transition-colors">Map</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--text-mid)] font-medium mr-2">
            <button className="hover:text-[var(--text-hi)] transition-colors">EN</button>
            <span className="text-[var(--border-strong)]">|</span>
            <button className="hover:text-[var(--text-hi)] transition-colors font-hi">हिं</button>
            <span className="text-[var(--border-strong)]">|</span>
            <button className="hover:text-[var(--text-hi)] transition-colors font-pa">ਪੰ</button>
          </div>
          
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/login">
              <PillButton variant="glass" size="md">Log in</PillButton>
            </Link>
            <Link href="/signup">
              <PillButton variant="primary-silver" size="md">Sign up</PillButton>
            </Link>
          </div>
          
          <button className="md:hidden p-2 text-[var(--text-mid)] hover:text-[var(--text-hi)]">
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
