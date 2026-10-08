"use client";

import * as React from "react";
import { HeroFloatCard } from "./HeroFloatCard";
import { Chip, SampleDataBadge } from "@/components/ui/Chip";
import { LuChartBar, LuFlame, LuBell, LuMapPin, LuCamera, LuArrowUpRight } from "react-icons/lu";
import { heroMock } from "@/lib/mock/heroMock";

export function TLCard() {
  return (
    <HeroFloatCard accent="emerald" tilt="left" className="w-[200px]">
      <div className="absolute top-0 right-4 -translate-y-1/2 z-10">
        <Chip className="bg-[var(--emerald)] text-[var(--bg-0)] font-bold border-none shadow-[0_4px_12px_rgba(16,185,129,0.3)] px-3 py-0.5 text-[10px]">
          Thu
        </Chip>
      </div>
      <div className="text-[10px] text-[var(--text-mid)] uppercase tracking-wider font-medium mb-3">Best day to clear</div>
      <div className="h-10 w-full relative">
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
    <div 
      className="hero-float-card glass-card flex items-center gap-2.5 rounded-full p-2 pr-4 w-max relative -rotate-2" 
      data-accent="emerald"
      style={{ boxShadow: "0 16px 40px rgba(0,0,0,0.5), 0 0 24px var(--card-accent)" }}
    >
      <div className="w-6 h-6 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center shrink-0">
        <LuArrowUpRight className="w-3 h-3 text-[var(--emerald)]" />
      </div>
      <span className="text-[11px] font-medium text-[var(--text-hi)] uppercase tracking-wide">Works in Punjabi</span>
    </div>
  );
}

export function BLCard() {
  return (
    <HeroFloatCard accent="amber" tilt="left" className="w-[240px]">
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-full bg-[var(--amber)]/20 flex items-center justify-center shrink-0">
          <LuChartBar className="w-4 h-4 text-[var(--amber)]" />
        </div>
        <SampleDataBadge />
      </div>
      <div className="text-[10px] text-[var(--text-mid)] uppercase tracking-wider mb-1">Machines free nearby</div>
      <div className="flex items-end justify-between">
        <div className="font-serif italic text-4xl text-[var(--text-hi)] leading-none">{heroMock.stats.machinesNearby}</div>
        <button className="w-7 h-7 rounded-full bg-[var(--bg-2)] border border-[var(--border-strong)] flex items-center justify-center hover:bg-[var(--bg-3)] transition-colors shrink-0 mb-0.5">
          <LuArrowUpRight className="w-3.5 h-3.5 text-[var(--text-hi)]" />
        </button>
      </div>
    </HeroFloatCard>
  );
}

export function TRCard() {
  return (
    <HeroFloatCard accent="cyan" tilt="right" className="w-[250px]">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <div className="font-serif italic text-4xl text-[var(--text-hi)] leading-none">{heroMock.citizen.aqi}</div>
          <div className="text-[10px] text-[var(--text-mid)] mt-1.5 uppercase tracking-wider">AQI today in your area</div>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--cyan)]/20 to-transparent rounded-full flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
          </svg>
        </div>
      </div>
      <Chip className="bg-[var(--cyan)]/10 text-[var(--cyan)] text-[10px] px-2.5 py-0.5 border border-[var(--cyan)]/20 mt-1">
        {heroMock.citizen.category}
      </Chip>
    </HeroFloatCard>
  );
}

export function BRCard() {
  return (
    <HeroFloatCard accent="red" tilt="right" className="w-[240px]">
      <div className="flex gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--red)]/20 to-[#0A0D14] border border-[var(--red)]/30 flex items-center justify-center shrink-0">
          <LuFlame className="w-6 h-6 text-red-400 opacity-90" />
        </div>
        <div className="flex flex-col justify-center py-0.5">
          <div className="text-sm font-medium text-[var(--text-hi)] mb-1">Report burning</div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] animate-pulse" />
            <span className="text-[10px] text-[var(--text-mid)] uppercase tracking-wider">Received</span>
          </div>
          <div className="flex items-center gap-2">
            <LuMapPin className="w-3 h-3 text-[var(--text-low)]" />
            <LuCamera className="w-3 h-3 text-[var(--text-low)]" />
            <LuBell className="w-3 h-3 text-[var(--text-low)]" />
          </div>
        </div>
      </div>
      <div className="absolute -top-3 -right-3 z-10">
        <div className="bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-hi)] text-[10px] px-2.5 py-1 rounded-t-lg rounded-bl-lg rounded-br-sm shadow-xl flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {heroMock.stats.reports} reports
        </div>
      </div>
    </HeroFloatCard>
  );
}
