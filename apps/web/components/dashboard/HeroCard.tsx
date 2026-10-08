'use client';

import { ReactNode } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SampleDataBadge } from '@/components/ui/Chip';
import { WeatherStrip } from './WeatherStrip';
import { WeatherStripData } from '@/lib/mock/dashboardData';
import { cn } from '@/lib/utils';

interface HeroCardProps {
  accent: 'emerald' | 'cyan' | 'blue';
  title: string;
  location: string;
  dateText: string;
  isSample?: boolean;
  weather: WeatherStripData;
  heroContent: ReactNode;
  miniStatsGrid: ReactNode;
  footerContent?: ReactNode;
  className?: string;
}

export function HeroCard({
  accent,
  title,
  location,
  dateText,
  isSample = true,
  weather,
  heroContent,
  miniStatsGrid,
  footerContent,
  className,
}: HeroCardProps) {
  const glowBg = {
    emerald: 'bg-[var(--emerald)]/10',
    cyan: 'bg-[var(--cyan)]/10',
    blue: 'bg-[var(--accent)]/10',
  }[accent] || 'bg-[var(--accent)]/10';

  const borderColor = {
    emerald: 'border-[var(--emerald)]/25',
    cyan: 'border-[var(--cyan)]/25',
    blue: 'border-[var(--accent)]/25',
  }[accent] || 'border-[var(--border)]';

  return (
    <GlassCard
      data-accent={accent}
      className={cn(
        'relative overflow-hidden border flex flex-col justify-between h-full min-h-0',
        borderColor,
        // Responsive padding scaled to fit shorter desktop viewports without overflow
        'p-3.5 sm:p-4 lg:p-4.5 xl:p-5 2xl:p-6',
        className
      )}
    >
      {/* Background radial accent glow */}
      <div
        className={cn(
          'absolute -top-24 -right-24 w-80 h-80 blur-[90px] rounded-full pointer-events-none z-0',
          glowBg
        )}
      />

      <div className="relative z-10 flex flex-col h-full justify-between gap-2.5 sm:gap-3 lg:gap-3.5 min-h-0">
        {/* 1. Header row: Title, SAMPLE DATA badge, location, date */}
        <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-serif italic text-[var(--text-hi)] leading-none">
              {title}
            </h1>
            {isSample && <SampleDataBadge className="text-[10px] py-0 px-2.5" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-mid)] font-medium">
            <span>{location}</span>
            <span className="text-[var(--text-low)]">•</span>
            <span className="text-[var(--text-low)]">{dateText}</span>
          </div>
        </div>

        {/* 2. Compact Weather Strip */}
        <div className="shrink-0">
          <WeatherStrip data={weather} />
        </div>

        {/* 3. Hero / Verdict Block */}
        <div className="flex-1 min-h-0 flex flex-col justify-center">
          {heroContent}
        </div>

        {/* 4. Mini Card Grid (2x2) */}
        <div className="shrink-0 min-h-0">
          {miniStatsGrid}
        </div>

        {/* 5. Footer: Positive reinforcement or rotating insight */}
        {footerContent && (
          <div className="shrink-0 pt-1 border-t border-[var(--border)]">
            {footerContent}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
