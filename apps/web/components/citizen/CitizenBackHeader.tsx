'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LuArrowLeft } from 'react-icons/lu';
import { useT } from '@/lib/i18n/useT';

interface CitizenBackHeaderProps {
  title?: string;
  badge?: React.ReactNode;
}

export function CitizenBackHeader({ title, badge }: CitizenBackHeaderProps) {
  const router = useRouter();
  const { t } = useT();

  return (
    <div className="sticky top-0 lg:top-16 z-[40] border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label={t('citizen.back') || 'Back'}
        className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg px-2 py-1 -ml-2"
      >
        <LuArrowLeft className="w-5 h-5" />
        <span className="font-semibold text-sm">{t('citizen.back') || 'Back'}</span>
      </button>

      {title && (
        <span className="font-serif italic text-base text-[var(--text-hi)] truncate px-2">
          {title}
        </span>
      )}

      <div>{badge}</div>
    </div>
  );
}
