"use client";

import * as React from "react";
import { HeroFloatCard } from "./HeroFloatCard";
import { Chip, SampleDataBadge } from "@/components/ui/Chip";
import { LuChartBar, LuFlame, LuBell, LuMapPin, LuCamera, LuArrowUpRight, LuWind, LuCalendar } from "react-icons/lu";
import { heroMock } from "@/lib/mock/heroMock";

export function TLCard() {
  const [day, date] = heroMock.farmer.bestDay.split(', ');
  
  return (
    <HeroFloatCard accent="emerald" tilt="left" className="w-[240px]">
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-full bg-[var(--emerald)]/10 flex items-center justify-center shrink-0">
          <LuCalendar className="w-4 h-4 text-[var(--emerald)]" />
        </div>
        <div className="bg-[var(--emerald)]/10 border border-[var(--emerald)]/20 text-[var(--emerald)] font-medium px-2 py-0.5 rounded text-[10px]">
          {date}
        </div>
      </div>
      <div className="text-[10px] text-[var(--text-mid)] uppercase tracking-wider mb-1">Best day to clear</div>
      <div className="font-serif italic text-3xl text-[var(--text-hi)] leading-none mb-3">{day}</div>
      <div className="text-[11px] text-[var(--text-mid)] leading-snug flex items-start gap-2 bg-[var(--bg-1)]/40 p-2 rounded-lg border border-[var(--border)]/50">
        <LuWind className="w-3.5 h-3.5 text-[var(--emerald)] shrink-0 mt-0.5" />
        <span>{heroMock.farmer.reason}</span>
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
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-full bg-[var(--red)]/10 flex items-center justify-center shrink-0">
          <LuFlame className="w-4 h-4 text-[var(--red)]" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] animate-pulse" />
          <span className="text-[10px] text-[var(--text-mid)] uppercase tracking-wider font-medium">Received</span>
        </div>
      </div>
      <div className="font-serif italic text-3xl text-[var(--text-hi)] leading-tight mb-3">Report burning</div>
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-[var(--border)]/30">
        <div className="text-[11px] text-[var(--text-mid)] font-medium">
          <span className="text-[var(--text-hi)]">{heroMock.stats.reports}</span> reports near you
        </div>
        <div className="flex items-center gap-1.5">
          <LuMapPin className="w-3.5 h-3.5 text-[var(--text-low)]" />
          <LuCamera className="w-3.5 h-3.5 text-[var(--text-low)]" />
        </div>
      </div>
    </HeroFloatCard>
  );
}
