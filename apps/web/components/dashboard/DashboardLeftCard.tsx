'use client';

import { ReactNode } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

interface DashboardLeftCardProps {
  accent: 'emerald' | 'cyan' | 'blue';
  weatherPanel: ReactNode;
  heroContent: ReactNode;
  miniStatsGrid: ReactNode;
  className?: string;
}

export function DashboardLeftCard({
  accent,
  weatherPanel,
  heroContent,
  miniStatsGrid,
  className,
}: DashboardLeftCardProps) {
  const borderColor = {
    emerald: 'border-[var(--emerald)]/25',
    cyan: 'border-[var(--cyan)]/25',
    blue: 'border-[var(--accent)]/25',
  }[accent] || 'border-[var(--border)]';

  return (
    <GlassCard
      data-accent={accent}
      className={cn(
        'border flex flex-col h-full min-h-0 overflow-hidden p-5 gap-3.5',
        borderColor,
        className
      )}
    >
      {/* 1. WEATHER ZONE */}
      <div 
        className="w-full shrink-0" 
        style={{ flex: '0 0 clamp(230px, 34%, 320px)' }}
      >
        {weatherPanel}
      </div>

      {/* 2. HERO */}
      <div className="w-full flex-col flex min-h-[150px]" style={{ flex: '1.2 1 0' }}>
        {heroContent}
      </div>

      {/* 3. STATS (2x2 grid) */}
      <div className="w-full" style={{ flex: '2.2 1 0' }}>
        {miniStatsGrid}
      </div>
    </GlassCard>
  );
}
