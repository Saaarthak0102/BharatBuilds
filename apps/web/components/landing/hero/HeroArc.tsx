"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function HeroArc({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 overflow-hidden", className)}>
      <div className="relative flex items-end justify-center w-[1000px] h-[500px]">
        {/* Inner glow filling the lower half circle */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[560px] h-[280px] bg-[var(--accent-glow)] blur-[80px] rounded-t-full opacity-60" />
        
        {/* SVG concentric rings */}
        <svg 
          viewBox="0 0 800 400" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-70 animate-[pulse_10s_ease-in-out_infinite]"
        >
          {/* Inner ring */}
          <path 
            d="M120 400 A 280 280 0 0 1 680 400" 
            stroke="rgba(255,255,255,0.08)" 
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Outer ring */}
          <path 
            d="M0 400 A 400 400 0 0 1 800 400" 
            stroke="rgba(255,255,255,0.08)" 
            strokeWidth="1"
            strokeDasharray="4 8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
