'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { todayIST } from '@/lib/utils/date';
import { LuShieldAlert, LuX, LuBell, LuArrowRight } from 'react-icons/lu';

interface AlertBannerProps {
  currentAqi?: number;
  areaName?: string;
}

export function AlertBanner({ currentAqi, areaName }: AlertBannerProps) {
  const [visible, setVisible] = useState(false);
  const [threshold, setThreshold] = useState(200);

  useEffect(() => {
    if (typeof window === 'undefined' || currentAqi == null) return;

    const savedEnabled = localStorage.getItem('saans_alert_enabled');
    const isEnabled = savedEnabled === null ? true : savedEnabled === 'true';
    if (!isEnabled) {
      setVisible(false);
      return;
    }

    const savedThreshold = localStorage.getItem('saans_alert_threshold');
    const thresh = savedThreshold ? Number(savedThreshold) : 200;
    setThreshold(thresh);

    const dismissKey = `saans_alert_dismissed_${todayIST()}`;
    const isDismissed = localStorage.getItem(dismissKey) === 'true';

    if (!isDismissed && currentAqi >= thresh) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [currentAqi]);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      const dismissKey = `saans_alert_dismissed_${todayIST()}`;
      localStorage.setItem(dismissKey, 'true');
    }
  };

  if (!visible || currentAqi == null) return null;

  return (
    <aside
      aria-label="High pollution threshold alert"
      className="w-full mb-4 p-3.5 sm:p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-white backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-300">
          <LuShieldAlert className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-rose-200">
            High Pollution Alert ({areaName || 'Your Ward'})
          </p>
          <p className="text-[11px] sm:text-xs text-[var(--text-mid)]">
            AQI is <strong className="text-rose-300">{currentAqi}</strong>, exceeding your alert threshold of {threshold}. Consider wearing an N95 mask.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <Link
          href="/citizen/alerts"
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-[var(--text-hi)] transition-colors"
        >
          <span>Adjust</span>
          <LuArrowRight className="w-3 h-3" />
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-[var(--text-low)] hover:text-[var(--text-hi)] p-1 transition-colors"
          title="Dismiss for today"
        >
          <LuX className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
