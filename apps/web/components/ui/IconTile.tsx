"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
}

export const IconTile = React.forwardRef<HTMLButtonElement, IconTileProps>(
  ({ className, icon, label, sublabel, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "glass-card flex flex-col items-start justify-between p-4 text-left transition-all duration-300",
          "hover:-translate-y-1 hover:bg-white/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          "h-full w-full",
          className
        )}
        {...props}
      >
        <div className="mb-3 rounded-full bg-[var(--bg-3)] p-2 text-[var(--accent)]">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-[var(--text-hi)] line-clamp-1">
            {label}
          </div>
          {sublabel && (
            <div className="mt-0.5 text-xs text-[var(--text-mid)] line-clamp-1">
              {sublabel}
            </div>
          )}
        </div>
      </button>
    );
  }
);
IconTile.displayName = "IconTile";
