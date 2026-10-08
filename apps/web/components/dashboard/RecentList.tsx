'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';

export interface RecentListItem {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  status: string;
  statusType?: 'confirmed' | 'pending' | 'completed' | 'verified' | 'action_taken' | 'submitted';
  icon?: ReactNode;
}

interface RecentListProps {
  title: string;
  items: RecentListItem[];
  totalCount?: number;
  emptyText?: string;
  onViewAll?: () => void;
  className?: string;
}

export function RecentList({
  title,
  items,
  totalCount,
  emptyText,
  onViewAll,
  className,
}: RecentListProps) {
  const { t } = useT();
  const displayItems = items.slice(0, 2);
  const showViewAll = (totalCount ?? items.length) > 2;

  const getStatusBadge = (status: string, statusType?: string) => {
    const norm = (statusType || status).toLowerCase().replace(/\s+/g, '_');
    if (norm === 'confirmed' || norm === 'verified' || norm === 'completed' || norm === 'action_taken') {
      return 'text-[var(--emerald)] bg-[var(--emerald)]/10 border-[var(--emerald)]/20';
    }
    if (norm === 'pending' || norm === 'submitted') {
      return 'text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/20';
    }
    return 'text-[var(--text-mid)] bg-[var(--bg-2)] border-[var(--border)]';
  };

  return (
    <div className={cn('w-full mt-3 pt-3 border-t border-[var(--border)]', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-mid)]">
          {title}
        </span>
        {showViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs text-[var(--accent)] hover:text-white transition-colors cursor-pointer"
          >
            {t('common.viewAll')}
          </button>
        )}
      </div>

      {displayItems.length === 0 ? (
        <p className="text-xs text-[var(--text-low)] py-1 italic">
          {emptyText || t('farmer.noBookings')}
        </p>
      ) : (
        <div className="space-y-1.5">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--bg-1)]/70 border border-[var(--border)] text-xs hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.icon && (
                  <div className="w-6 h-6 rounded bg-[var(--bg-2)] flex items-center justify-center shrink-0 text-[var(--text-mid)]">
                    {item.icon}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text-hi)] truncate leading-tight">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-low)] truncate leading-tight mt-0.5">
                    {item.subtitle}
                    {item.meta && ` • ${item.meta}`}
                  </div>
                </div>
              </div>

              <span
                className={cn(
                  'shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider',
                  getStatusBadge(item.status, item.statusType)
                )}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
