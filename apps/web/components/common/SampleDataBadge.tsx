'use client';

import { useT } from '@/lib/i18n/useT';

export function SampleDataBadge() {
  const { t } = useT();
  return (
    <span className="sample-badge" title="This is simulated data for demonstration purposes">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {t('common.sampleData')}
    </span>
  );
}
