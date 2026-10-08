import * as React from "react";
import { Chip, SampleDataBadge } from "@/components/ui/Chip";
import { LuUser, LuArrowRight } from "react-icons/lu";
import { heroMock } from "@/lib/mock/heroMock";

export function PhoneSlideFarmer() {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-0)] p-5 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center">
          <LuUser className="w-4 h-4 text-[var(--text-mid)]" />
        </div>
        <Chip className="bg-[var(--emerald)]/20 text-[var(--emerald)] border-none gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-pulse" />
          Live
        </Chip>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="text-sm text-[var(--text-mid)] mb-2">Best day to clear</div>
        <div className="text-2xl font-semibold mb-6 flex items-center justify-between bg-gradient-to-r from-[var(--emerald)] to-green-300 bg-clip-text text-transparent">
          {heroMock.farmer.bestDay}
          <LuArrowRight className="w-5 h-5 text-[var(--emerald)]" />
        </div>

        {/* 7-day strip mock */}
        <div className="flex gap-1 h-3 w-full rounded-full bg-[var(--bg-1)] overflow-hidden mb-6">
          <div className="w-[14%] bg-[var(--emerald)] opacity-30" />
          <div className="w-[14%] bg-[var(--emerald)] opacity-50" />
          <div className="w-[14%] bg-[var(--emerald)] opacity-20" />
          <div className="w-[14%] bg-[var(--emerald)] opacity-100" />
          <div className="w-[14%] bg-[var(--emerald)] opacity-40" />
          <div className="w-[14%] bg-[var(--emerald)] opacity-10" />
          <div className="w-[14%] bg-[var(--emerald)] opacity-30" />
        </div>

        <p className="text-sm text-[var(--text-mid)] mb-8 leading-relaxed">
          {heroMock.farmer.reason}
        </p>

        <div className="mt-auto">
          <button className="w-full h-12 rounded-full bg-[var(--emerald)] text-black font-medium hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 mb-4">
            Open planner
          </button>
          
          <div className="font-mono text-[10px] text-[var(--text-low)] text-center">
            &gt; Agent trace: weather OK, wind OK
          </div>
        </div>
      </div>
    </div>
  );
}
