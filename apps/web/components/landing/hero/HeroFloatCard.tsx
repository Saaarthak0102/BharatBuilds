"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface HeroFloatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent: "emerald" | "amber" | "cyan" | "red" | "violet" | "green";
  tilt?: "left" | "right";
  delay?: number;
}

export const HeroFloatCard = React.forwardRef<HTMLDivElement, HeroFloatCardProps>(
  ({ className, accent, tilt = "left", children, ...props }, ref) => {
    
    // Using local inline vars to enforce accent without changing the global data-accent
    const accentColors = {
      emerald: "rgba(16, 185, 129, 0.15)",
      amber: "rgba(245, 158, 11, 0.15)",
      cyan: "rgba(34, 211, 238, 0.15)",
      red: "rgba(239, 68, 68, 0.15)",
      violet: "rgba(139, 92, 246, 0.15)",
      green: "rgba(34, 197, 94, 0.15)",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "hero-float-card relative p-4 md:p-5 rounded-[20px]",
          "bg-gradient-to-b from-[#1E2633] to-[#0D1117]",
          "border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
          "backdrop-blur-xl transition-all duration-300",
          "hover:-translate-y-1 hover:brightness-110",
          tilt === "left" ? "-rotate-2" : "rotate-2",
          className
        )}
        style={{
          boxShadow: `0 16px 40px rgba(0,0,0,0.5), 0 0 30px ${accentColors[accent]}`,
        }}
        {...props}
      >
        <div 
          className="absolute inset-0 rounded-[20px] pointer-events-none"
          style={{ background: `linear-gradient(180deg, ${accentColors[accent]}, transparent 60%)` }}
        />
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </div>
    );
  }
);
HeroFloatCard.displayName = "HeroFloatCard";
