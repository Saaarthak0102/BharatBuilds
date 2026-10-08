import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SectionHeading({ title, subtitle, align = "center", className }: SectionHeadingProps) {
  return (
    <div className={cn(
      "flex flex-col gap-2",
      {
        "text-left": align === "left",
        "text-center items-center": align === "center",
        "text-right items-end": align === "right",
      },
      className
    )}>
      <h2 className="font-serif italic text-4xl md:text-5xl lg:text-6xl text-[var(--text-hi)] tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[var(--text-mid)] text-base md:text-lg max-w-2xl text-balance">
          {subtitle}
        </p>
      )}
    </div>
  );
}
