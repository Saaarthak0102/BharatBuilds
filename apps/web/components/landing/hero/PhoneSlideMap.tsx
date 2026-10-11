import * as React from "react";
import { LuFlame, LuWind, LuArrowUpRight, LuCompass } from "react-icons/lu";

export function PhoneSlideMap() {
  return (
    <div className="flex flex-col h-full bg-[#080C14] text-white text-xs select-none overflow-hidden relative">
      {/* Mini App TopBar */}
      <div className="flex items-center justify-between p-3 pb-2 border-b border-white/10 z-20 bg-[#080C14]/90 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[var(--violet)]/20 border border-[var(--violet)]/40 flex items-center justify-center text-[var(--violet)] font-bold text-[10px]">
            🗺️
          </div>
          <span className="font-semibold text-[11px] text-[var(--text-hi)]">Live Satellite & Grid</span>
        </div>
        <span className="text-[9px] font-bold text-[var(--violet)] bg-[var(--violet)]/10 px-2 py-0.5 rounded-full border border-[var(--violet)]/20">
          Live
        </span>
      </div>

      {/* Map Graphic Canvas */}
      <div className="flex-1 relative overflow-hidden bg-[#0A1017]">
        {/* Soft heatmap background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0A1017]/60 to-[#0A1017]" />

        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Punjab Fire Clusters (Red glowing markers) */}
        <div className="absolute top-[22%] left-[32%] flex flex-col items-center">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute inset-0 opacity-75" />
            <div className="w-3 h-3 rounded-full bg-red-600 border border-red-300 flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.8)]">
              <LuFlame className="w-2 h-2 text-white" />
            </div>
          </div>
          <span className="text-[8px] font-bold text-red-300 mt-0.5 bg-black/60 px-1 rounded">Amritsar</span>
        </div>

        <div className="absolute top-[35%] left-[46%] flex flex-col items-center">
          <div className="relative">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 animate-ping absolute inset-0 opacity-60" />
            <div className="w-3.5 h-3.5 rounded-full bg-orange-600 border border-amber-300 flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.8)]">
              <LuFlame className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <span className="text-[8px] font-bold text-orange-300 mt-0.5 bg-black/60 px-1 rounded">Patiala</span>
        </div>

        {/* Wind drift vector arrows toward Delhi */}
        <div className="absolute top-[44%] left-[54%] flex items-center gap-1 text-cyan-400/70 rotate-[35deg]">
          <LuWind className="w-4 h-4 animate-pulse" />
          <span className="text-[7px] font-mono">14 km/h SE</span>
        </div>

        {/* Delhi NCR AQI Station */}
        <div className="absolute top-[64%] left-[64%] flex flex-col items-center">
          <div className="px-1.5 py-0.5 rounded-full bg-red-600/90 text-white font-bold text-[8px] border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.7)] flex items-center gap-0.5">
            <span>285</span>
          </div>
          <span className="text-[8px] font-bold text-white mt-0.5 bg-black/70 px-1 rounded">Delhi NCR</span>
        </div>

        {/* Active Inspection Card on map */}
        <div className="absolute bottom-12 left-3 right-3 p-2 rounded-xl bg-[#111824]/95 border border-white/10 backdrop-blur-md shadow-2xl z-20">
          <div className="flex items-center justify-between text-[9px] mb-1">
            <span className="font-bold text-[var(--violet)] flex items-center gap-1">
              <LuCompass className="w-3 h-3" /> Patiala Straw Hub
            </span>
            <span className="text-emerald-400 font-semibold">18 Slots Free</span>
          </div>
          <p className="text-[8px] text-[var(--text-mid)] leading-tight">
            Wind blowing smoke south-east. Burning avoided: 450 tonnes straw diverted.
          </p>
        </div>

        {/* Layer Toggles at top of map */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex gap-1">
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-bold">AQI</span>
            <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 text-[8px] font-bold">Fires (14)</span>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[8px] font-bold">Machines</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-2.5 z-20 bg-[#080C14] border-t border-white/10">
        <button className="w-full py-2 rounded-xl bg-[var(--violet)] text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:brightness-110 transition-all shadow-md">
          <span>Open Full Interactive Map</span>
          <LuArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
