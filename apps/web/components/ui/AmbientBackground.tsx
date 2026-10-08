"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AmbientBackgroundProps {
  accent?: "emerald" | "cyan" | "blue" | "violet" | "red" | "amber" | string;
  intensity?: number;
  grid?: boolean;
  aqiCategory?: string;
}

export function AmbientBackground({ 
  accent = "blue", 
  intensity = 1, 
  grid = true,
  aqiCategory
}: AmbientBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (accent) {
      document.documentElement.setAttribute("data-accent", accent);
    }
  }, [accent]);

  if (!mounted) return null;

  const isPoorOrWorse = aqiCategory && ['Poor', 'Very Poor', 'Severe'].includes(aqiCategory);

  return (
    <div className="fixed inset-0 z-[-10] pointer-events-none overflow-hidden bg-black">
      {/* Radial Glow */}
      <div 
        className={cn(
          "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
          "w-[800px] h-[500px] md:w-[1200px] md:h-[600px]",
          "bg-[var(--accent-glow)] rounded-full blur-[100px]",
          "transition-colors duration-400 ease-in-out"
        )}
        style={{ opacity: intensity }}
      />
      
      {/* Optional Amber Tint for bad AQI */}
      {isPoorOrWorse && (
        <div 
          className="absolute right-0 top-1/4 w-[400px] h-[500px] bg-amber-500/10 blur-[120px] rounded-full transition-opacity duration-1000"
        />
      )}

      {/* Grid Texture */}
      {grid && (
        <div 
          className={cn(
            "absolute inset-0 opacity-[0.03]",
            "transition-opacity duration-400 ease-in-out"
          )}
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--text-hi) 1px, transparent 1px),
              linear-gradient(to bottom, var(--text-hi) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)'
          }}
        />
      )}
    </div>
  );
}
