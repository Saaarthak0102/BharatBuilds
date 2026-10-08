"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number;
  caption: string;
  trend?: "up" | "down" | "neutral";
}

export function StatTile({ className, value, caption, trend, ...props }: StatTileProps) {
  // Simple count up effect can be added here with framer-motion or standard react hooks
  // Using simple display for now to respect motion limits and performance
  
  return (
    <div className={cn("flex flex-col items-start", className)} {...props}>
      <div className="font-serif italic text-4xl md:text-5xl tracking-tight text-[var(--text-hi)]">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-[var(--text-mid)]">
        {caption}
      </div>
    </div>
  );
}
