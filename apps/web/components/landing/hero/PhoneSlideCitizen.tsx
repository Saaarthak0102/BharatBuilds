import * as React from "react";
import { Chip } from "@/components/ui/Chip";
import { LuMapPin, LuFlame } from "react-icons/lu";
import { heroMock } from "@/lib/mock/heroMock";

export function PhoneSlideCitizen() {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-0)] p-5 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2 text-[var(--text-mid)]">
          <LuMapPin className="w-4 h-4" />
          <span className="text-sm">South Delhi</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="text-sm text-[var(--text-mid)] mb-6">Today in your area</div>
        
        {/* Big AQI Circle */}
        <div className="w-32 h-32 rounded-full border-[4px] border-[var(--cyan)]/20 flex flex-col items-center justify-center mb-6 relative">
          <div className="absolute inset-0 rounded-full border-[4px] border-[var(--cyan)] border-t-transparent border-r-transparent transform -rotate-45" />
          <span className="text-4xl font-serif italic text-[var(--text-hi)]">{heroMock.citizen.aqi}</span>
          <span className="text-xs text-[var(--cyan)] font-medium uppercase tracking-wider">{heroMock.citizen.category}</span>
        </div>

        <p className="text-sm text-[var(--text-hi)] mb-12 max-w-[200px] leading-relaxed bg-[var(--bg-1)] p-3 rounded-2xl border border-[var(--border)]">
          {heroMock.citizen.advice}
        </p>

        <div className="mt-auto w-full">
          <button className="w-full h-12 rounded-full bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20 font-medium hover:bg-[var(--red)]/20 transition-colors flex items-center justify-center gap-2">
            <LuFlame className="w-4 h-4" />
            Report burning
          </button>
        </div>
      </div>
    </div>
  );
}
