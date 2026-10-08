'use client';

import { ReactNode } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LuArrowRight } from 'react-icons/lu';
import { cn } from '@/lib/utils';

interface ActionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  showArrow?: boolean;
  accent?: 'emerald' | 'cyan' | 'red' | 'amber' | 'violet';
  badge?: string;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
}

export function ActionCard({
  title,
  description,
  icon,
  showArrow = true,
  accent = 'emerald',
  badge,
  onClick,
  children,
  className,
}: ActionCardProps) {
  const accentBorder = {
    emerald: 'border-[var(--emerald)]/20 hover:border-[var(--emerald)]/50',
    cyan: 'border-[var(--cyan)]/20 hover:border-[var(--cyan)]/50',
    red: 'border-[var(--red)]/30 hover:border-[var(--red)]/60 bg-gradient-to-br from-[var(--red)]/10 to-[var(--bg-1)]',
    amber: 'border-[var(--amber)]/25 hover:border-[var(--amber)]/50',
    violet: 'border-[var(--violet)]/20 hover:border-[var(--violet)]/50',
  }[accent] || 'border-[var(--border)] hover:border-[var(--border-strong)]';

  const accentTitleColor = {
    emerald: 'text-[var(--emerald)] group-hover:text-[var(--accent-2)]',
    cyan: 'text-[var(--cyan)] group-hover:text-[var(--accent-2)]',
    red: 'text-[var(--red)] group-hover:text-red-300',
    amber: 'text-[var(--amber)] group-hover:text-amber-300',
    violet: 'text-[var(--violet)] group-hover:text-violet-300',
  }[accent] || 'text-[var(--text-hi)]';

  return (
    <GlassCard
      data-accent={accent}
      onClick={onClick}
      className={cn(
        'group interactive-card flex flex-col justify-between transition-all duration-300 border p-3.5 sm:p-4',
        accentBorder,
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            {icon && <span className={cn('text-lg', accentTitleColor)}>{icon}</span>}
            <h3 className={cn('font-bold text-base sm:text-lg transition-colors leading-tight', accentTitleColor)}>
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-mid)] font-semibold">
                {badge}
              </span>
            )}
          </div>
          {showArrow && (
            <LuArrowRight className={cn('w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1', accentTitleColor)} />
          )}
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-[var(--text-mid)] line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {children}
    </GlassCard>
  );
}
