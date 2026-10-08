"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LuLoader } from "react-icons/lu";

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary-silver" | "accent" | "glass" | "danger";
  size?: "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
}

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  (
    {
      className,
      variant = "primary-silver",
      size = "md",
      icon,
      iconPosition = "left",
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium interactive-tactile",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-0)]",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            // Sizes
            "h-10 px-6 py-2": size === "md",
            "h-12 px-8 py-3 text-base": size === "lg",
            
            // Variants
            "bg-gradient-to-b from-[#F8FAFC] to-[#CBD5E1] text-[#07090D] shadow-[0_0_12px_rgba(255,255,255,0.3)] border border-white/40":
              variant === "primary-silver",
              
            "bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]":
              variant === "accent",
              
            "glass-card border-[var(--border-strong)] text-white":
              variant === "glass",
              
            "bg-red-500/10 text-red-500 border border-red-500/20":
              variant === "danger",
          },
          className
        )}
        {...props}
      >
        {isLoading && <LuLoader className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && icon && iconPosition === "left" && (
          <span className="mr-2">{icon}</span>
        )}
        {children}
        {!isLoading && icon && iconPosition === "right" && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    );
  }
);
PillButton.displayName = "PillButton";
