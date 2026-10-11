import * as React from "react";
import { LuMapPin, LuFlame, LuWind, LuShieldAlert, LuArrowRight, LuCircleCheck } from "react-icons/lu";

export function PhoneSlideCitizen() {
  return (
    <div className="flex flex-col h-full bg-[#080C14] p-3 text-white text-xs select-none overflow-hidden">
      {/* Mini App TopBar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[var(--cyan)]/20 border border-[var(--cyan)]/40 flex items-center justify-center text-[var(--cyan)] font-bold text-[10px]">
            🌬️
          </div>
          <span className="font-semibold text-[11px] text-[var(--text-hi)]">Citizen Dashboard</span>
        </div>
        <div className="w-5 h-5 rounded-full bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[9px] text-[var(--text-hi)] font-bold">
          C
        </div>
      </div>

      <div className="space-y-2 flex-1 flex flex-col justify-between">
        {/* Location & AQI Hero Card (Matches /citizen) */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-[#121B28] to-[#0B131E] border border-cyan-500/30 shadow-md text-center relative overflow-hidden">
          <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-mid)] mb-1">
            <LuMapPin className="w-3 h-3 text-cyan-400" />
            <span>South Delhi (Hauz Khas)</span>
          </div>

          <div className="my-1">
            <span className="text-4xl font-serif italic text-amber-400 tracking-tight">285</span>
            <div className="inline-block ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 uppercase">
              POOR
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-[9px] text-[var(--text-mid)] mt-1">
            <span>PM2.5: <strong className="text-white">182 µg/m³</strong></span>
            <span>•</span>
            <span className="flex items-center gap-0.5"><LuWind className="w-3 h-3 text-cyan-400" /> 14 km/h NW</span>
          </div>

          <div className="mt-2 py-1 px-2 rounded-lg bg-black/40 border border-white/5 text-[9px] text-amber-200/90 flex items-center justify-center gap-1">
            <LuShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Sensitive groups: wear N95 mask outdoors</span>
          </div>
        </div>

        {/* Action: Report Stubble Burning Card */}
        <div className="p-2.5 rounded-xl bg-[#101724] border border-red-500/20">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="font-semibold text-white flex items-center gap-1">
              <LuFlame className="w-3.5 h-3.5 text-red-400" />
              Report Burning Smoke
            </span>
            <span className="text-[8px] text-[var(--text-low)]">AI Verification</span>
          </div>
          <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-white font-medium">GT Road Bypass Smoke</span>
              <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                ROUTED
              </span>
            </div>
            <div className="text-[8px] text-[var(--text-low)] flex items-center gap-1">
              <LuCircleCheck className="w-2.5 h-2.5 text-emerald-400" />
              Routed to Punjab Agriculture Dept
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-1 pt-0.5 text-center text-[9px]">
          <div className="p-1.5 rounded-lg bg-[#0E1520] border border-white/5">
            <div className="text-[8px] text-[var(--text-low)]">Reports</div>
            <div className="font-bold text-white text-[11px]">3</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[#0E1520] border border-white/5">
            <div className="text-[8px] text-[var(--text-low)]">Routed</div>
            <div className="font-bold text-amber-400 text-[11px]">2</div>
          </div>
          <div className="p-1.5 rounded-lg bg-[#0E1520] border border-white/5">
            <div className="text-[8px] text-[var(--text-low)]">Resolved</div>
            <div className="font-bold text-emerald-400 text-[11px]">1</div>
          </div>
        </div>

        {/* Bottom CTA */}
        <button className="w-full py-2 rounded-xl bg-[var(--cyan)] text-black font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:brightness-110 transition-all mt-1 shadow-md">
          <span>Report Smoke Incident</span>
          <LuArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
