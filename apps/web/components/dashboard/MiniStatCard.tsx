'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MiniStatCardProps {
  label: string;
  value?: ReactNode;
  caption?: ReactNode;
  icon?: ReactNode;
  badge?: string;
  className?: string;
  children?: ReactNode;
  accent?: 'emerald' | 'cyan' | 'amber' | 'blue' | 'violet';
}

export function MiniStatCard({
  label,
  value,
  caption,
  icon,
  badge,
  className,
  children,
  accent,
}: MiniStatCardProps) {
  const accentBorder = accent
    ? {
        emerald: 'hover:border-[var(--emerald)]/40',
        cyan: 'hover:border-[var(--cyan)]/40',
        amber: 'hover:border-[var(--amber)]/40',
        blue: 'hover:border-[var(--accent)]/40',
        violet: 'hover:border-[var(--violet)]/40',
      }[accent]
    : 'hover:border-[var(--border-strong)]';

  return (
    <div
      className={cn(
        'rounded-xl bg-[var(--bg-1)]/80 border border-[var(--border)] p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 min-h-[88px] overflow-visible',
        accentBorder,
        className
      )}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-mid)] truncate">
          {label}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {badge && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-low)] font-mono">
              {badge}
            </span>
          )}
          {icon && <span className="text-[var(--text-low)]">{icon}</span>}
        </div>
      </div>

      {children ? (
        <div className="flex-1 flex flex-col justify-center min-h-0">{children}</div>
      ) : (
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <div className="font-serif italic text-lg sm:text-xl lg:text-[clamp(1.5rem,3.5vh,2.5rem)] text-[var(--text-hi)] leading-tight truncate">
            {value}
          </div>
          {caption && (
            <div className="text-[11px] lg:text-[clamp(0.7rem,1.5vh,0.85rem)] text-[var(--text-low)] truncate mt-1">
              {caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
