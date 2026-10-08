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
          "hover:-translate-y-1 hover:brightness-110",
          tilt === "left" ? "-rotate-2" : "rotate-2",
          className
        )}
        data-accent={accent}
        {...props}
      >
        {children}
      </div>
    );
  }
);
HeroFloatCard.displayName = "HeroFloatCard";
