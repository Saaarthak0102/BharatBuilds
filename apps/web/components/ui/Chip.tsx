import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "accent";
}

export function Chip({ className, variant = "default", children, ...props }: ChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider",
        {
          "bg-[var(--bg-3)] text-[var(--text-hi)]": variant === "default",
          "border border-[var(--border-strong)] bg-transparent text-[var(--text-mid)]": variant === "outline",
          "bg-[var(--accent-soft)] text-[var(--accent-2)] border border-[var(--accent-glow)]": variant === "accent",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SampleDataBadge({ className }: { className?: string }) {
  return null;
}

export function StatusDot({ status, className }: { status: "received" | "routed" | "resolved" | "active" | "warning", className?: string }) {
  return (
    <span className={cn(
      "h-2 w-2 rounded-full",
      {
        "bg-[var(--accent)]": status === "received" || status === "active",
        "bg-[var(--amber)]": status === "warning" || status === "routed",
        "bg-[var(--green)]": status === "resolved",
      },
      className
    )} />
  );
}
