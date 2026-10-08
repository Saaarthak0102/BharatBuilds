"use client";

import * as React from "react";
import { HeroFloatCard } from "./HeroFloatCard";
import { Chip, SampleDataBadge } from "@/components/ui/Chip";
import { LuChartBar, LuFlame, LuBell, LuMapPin, LuCamera, LuArrowUpRight } from "react-icons/lu";
import { heroMock } from "@/lib/mock/heroMock";

export function TLCard() {
  return (
    <HeroFloatCard accent="emerald" tilt="left" className="w-[200px]">
      <div className="absolute top-0 right-4 -translate-y-1/2">
        <Chip className="bg-[var(--emerald)] text-black font-bold border-none shadow-[0_4px_10px_rgba(16,185,129,0.3)] px-2 py-0.5 text-[10px]">
          Thu
        </Chip>
      </div>
      <div className="text-xs text-[var(--emerald)] font-medium mb-3">Best day to clear</div>
      <div className="h-10 w-full relative mb-1">
        {/* Mock Sparkline */}
        <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <path d="M0,35 Q10,20 20,30 T40,25 T60,10 T80,15 T100,5" fill="none" stroke="var(--emerald)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="60" cy="10" r="3" fill="var(--emerald)" className="animate-pulse" />
        </svg>
      </div>
    </HeroFloatCard>
  );
}

export function TLPill() {
  return (
    <div className="hero-float-card flex items-center gap-2 rounded-full bg-[var(--bg-1)]/80 border border-white/10 p-2 pr-4 backdrop-blur-md shadow-lg w-max relative -rotate-2">
      <div className="w-6 h-6 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center">
        <LuArrowUpRight className="w-3 h-3 text-[var(--emerald)]" />
      </div>
      <span className="text-xs font-medium text-[var(--text-hi)]">Works in Punjabi</span>
    </div>
  );
}

export function BLCard() {
  return (
    <HeroFloatCard accent="amber" tilt="left" className="w-[240px]">
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-full bg-[var(--amber)]/20 flex items-center justify-center">
          <LuChartBar className="w-4 h-4 text-[var(--amber)]" />
        </div>
        <SampleDataBadge />
      </div>
      <div className="text-[10px] text-[var(--text-mid)] uppercase tracking-wider mb-1">Machines free nearby</div>
      <div className="flex items-end justify-between">
        <div className="font-serif italic text-4xl text-[var(--text-hi)]">{heroMock.stats.machinesNearby}</div>
        <button className="w-6 h-6 rounded-full bg-[var(--bg-2)] border border-[var(--border-strong)] flex items-center justify-center hover:bg-[var(--bg-3)] transition-colors">
          <LuArrowUpRight className="w-3 h-3 text-[var(--text-hi)]" />
        </button>
      </div>
    </HeroFloatCard>
  );
}

export function TRCard() {
  return (
    <HeroFloatCard accent="cyan" tilt="right" className="w-[250px]">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <div className="font-serif italic text-4xl text-[var(--text-hi)] leading-none">{heroMock.citizen.aqi}</div>
          <div className="text-[10px] text-[var(--text-mid)] mt-1">AQI today in your area</div>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--cyan)]/20 to-transparent rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
          </svg>
        </div>
      </div>
      <Chip className="bg-[var(--cyan)]/20 text-[var(--cyan)] text-[10px] px-2 py-0 border-none mt-2">
        {heroMock.citizen.category}
      </Chip>
    </HeroFloatCard>
  );
}

export function BRCard() {
  return (
    <HeroFloatCard accent="red" tilt="right" className="w-[240px]">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-red-500/20 to-[#0A0D14] border border-red-500/30 flex items-center justify-center shrink-0">
          <LuFlame className="w-6 h-6 text-red-400 opacity-80" />
        </div>
        <div className="flex flex-col justify-between py-0.5">
          <div className="text-sm font-medium text-[var(--text-hi)]">Report burning</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />
            <span className="text-[10px] text-[var(--text-mid)]">Received</span>
          </div>
          <div className="flex items-center gap-2 mt-auto">
            <LuMapPin className="w-3 h-3 text-[var(--text-low)]" />
            <LuCamera className="w-3 h-3 text-[var(--text-low)]" />
            <LuBell className="w-3 h-3 text-[var(--text-low)]" />
          </div>
        </div>
      </div>
      <div className="absolute -top-3 -right-3">
        <div className="bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-hi)] text-[10px] px-2 py-1 rounded-t-lg rounded-bl-lg rounded-br-sm shadow-xl flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-red-500" />
          {heroMock.stats.reports} reports
        </div>
      </div>
    </HeroFloatCard>
  );
}
