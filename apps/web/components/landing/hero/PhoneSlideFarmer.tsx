import * as React from "react";
import { LuSun, LuWind, LuDroplets, LuTractor, LuCheck, LuArrowRight } from "react-icons/lu";

export function PhoneSlideFarmer() {
  return (
    <div className="flex flex-col h-full bg-[#080C14] p-3 text-white text-xs select-none overflow-hidden">
      {/* Mini App TopBar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[var(--emerald)]/20 border border-[var(--emerald)]/40 flex items-center justify-center text-[var(--emerald)] font-bold text-[10px]">
            🌱
          </div>
          <span className="font-semibold text-[11px] text-[var(--text-hi)]">Farmer Dashboard</span>
        </div>
        <div className="w-5 h-5 rounded-full bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[9px] text-[var(--text-hi)] font-bold">
          G
        </div>
      </div>

      <div className="space-y-2 flex-1 flex flex-col justify-between">
        {/* My Field & Weather Card */}
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#131B26] to-[#0D121B] border border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-mid)] mb-1.5">
            <span className="font-serif italic text-white text-[11px]">My Field</span>
            <span>Rajpura, Patiala</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <LuSun className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-base font-bold text-white leading-none">24°</span>
                <span className="text-[10px] text-[var(--text-mid)] ml-1">Clear</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-[var(--text-mid)]">
              <span className="flex items-center gap-0.5"><LuWind className="w-3 h-3 text-cyan-400" /> 12 km/h</span>
              <span className="flex items-center gap-0.5"><LuDroplets className="w-3 h-3 text-blue-400" /> 48%</span>
            </div>
          </div>
        </div>

        {/* Best Clearing Day Card (Matches /farmer) */}
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#122220] to-[#0A1616] border border-[var(--emerald)]/30 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--emerald)] bg-[var(--emerald)]/15 px-2 py-0.5 rounded-full border border-[var(--emerald)]/30">
              BEST CLEARING DAY
            </span>
            <span className="text-[10px] font-semibold text-[var(--emerald)]">Score: 75/100</span>
          </div>
          <h4 className="text-lg font-serif italic text-white my-0.5">
            Monday, 12 Oct
          </h4>
          <p className="text-[9px] text-[var(--text-mid)] line-clamp-2 leading-relaxed">
            Optimal window: low humidity, favorable winds blowing away from NCR.
          </p>
        </div>

        {/* Machine Booking Card */}
        <div className="p-2.5 rounded-xl bg-[#101622] border border-white/10">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="font-semibold text-white">Book a machine</span>
            <span className="text-[9px] text-[var(--emerald)] font-medium flex items-center gap-0.5">
              <LuCheck className="w-2.5 h-2.5" /> Slot Active
            </span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/40 border border-white/5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <LuTractor className="w-3.5 h-3.5 text-[var(--emerald)]" />
              <div>
                <div className="text-[10px] font-semibold text-white">Happy Seeder 7-Row</div>
                <div className="text-[8px] text-[var(--text-low)]">Kisan Seva Kendra, Patiala</div>
              </div>
            </div>
            <span className="text-[8px] font-bold text-[var(--emerald)] bg-[var(--emerald)]/10 px-1.5 py-0.5 rounded border border-[var(--emerald)]/20">
              COMPLETED
            </span>
          </div>
        </div>

        {/* Impact Bar */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <div className="p-2 rounded-lg bg-[#0E1520] border border-white/5 text-center">
            <div className="text-[8px] text-[var(--text-low)] uppercase">Earnings</div>
            <div className="text-xs font-bold text-amber-400">₹10,000</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0E1520] border border-white/5 text-center">
            <div className="text-[8px] text-[var(--text-low)] uppercase">PM2.5 Saved</div>
            <div className="text-xs font-bold text-[var(--emerald)]">143 kg</div>
          </div>
        </div>

        {/* Bottom CTA */}
        <button className="w-full py-2 rounded-xl bg-[var(--emerald)] text-black font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:brightness-110 transition-all mt-1 shadow-md">
          <span>Open Clearing Planner</span>
          <LuArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
