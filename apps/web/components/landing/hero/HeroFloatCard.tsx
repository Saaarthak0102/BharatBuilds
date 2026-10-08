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
    return (
      <div
        ref={ref}
        className={cn(
          "hero-float-card glass-card p-4 md:p-5 transition-all duration-300",
          tilt === "left" ? "-rotate-2" : "rotate-2",
          className
        )}
        data-accent={accent}
        style={{
          boxShadow: "0 16px 40px rgba(0,0,0,0.5), 0 0 24px var(--card-accent)",
          ...props.style
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
HeroFloatCard.displayName = "HeroFloatCard";
