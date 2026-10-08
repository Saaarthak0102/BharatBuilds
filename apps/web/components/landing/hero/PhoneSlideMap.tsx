import * as React from "react";
import { Chip } from "@/components/ui/Chip";
import { LuWind } from "react-icons/lu";

export function PhoneSlideMap() {
  return (
    <div className="flex flex-col h-full bg-[#0A1017] text-white relative overflow-hidden">
      {/* Soft heatmap background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0A1017]/50 to-[#0A1017]" />
      
      {/* Glowing fire dots in the north */}
      <div className="absolute top-[20%] left-[40%] w-16 h-16 bg-red-500/20 blur-[20px] rounded-full" />
      <div className="absolute top-[25%] left-[30%] w-12 h-12 bg-orange-500/20 blur-[15px] rounded-full" />
      <div className="absolute top-[30%] left-[50%] w-20 h-20 bg-red-500/15 blur-[25px] rounded-full" />
      
      {/* Tiny sharp fire dots */}
      <div className="absolute top-[22%] left-[42%] w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_red]" />
      <div className="absolute top-[26%] left-[32%] w-1 h-1 bg-orange-400 rounded-full shadow-[0_0_5px_orange]" />
      <div className="absolute top-[32%] left-[52%] w-2 h-2 bg-red-600 rounded-full shadow-[0_0_10px_red]" />
      
      {/* Faint drift arrow toward Delhi */}
      <LuWind className="absolute top-[40%] left-[45%] text-gray-400/30 w-12 h-12 transform rotate-45" />

      {/* Delhi marker */}
      <div className="absolute top-[60%] left-[60%] flex flex-col items-center">
        <div className="w-2 h-2 rounded-full border border-white/50 bg-[#0A1017]" />
        <span className="text-[10px] text-white/50 mt-1">Delhi</span>
      </div>

      {/* Layer Chips */}
      <div className="absolute bottom-6 left-4 right-4 flex flex-wrap gap-2">
        <Chip className="bg-[var(--violet)]/20 text-[var(--violet)] border border-[var(--violet)]/30 backdrop-blur-md">AQI</Chip>
        <Chip className="bg-[var(--bg-1)]/80 text-[var(--text-mid)] border border-[var(--border)] backdrop-blur-md">Fires</Chip>
        <Chip className="bg-[var(--bg-1)]/80 text-[var(--text-mid)] border border-[var(--border)] backdrop-blur-md">Wind</Chip>
      </div>
    </div>
  );
}
