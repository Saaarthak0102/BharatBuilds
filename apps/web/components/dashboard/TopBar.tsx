'use client';

import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { Logo } from '../common/Logo';
import { useT } from '@/lib/i18n/useT';
import { ProfileMenu } from './ProfileMenu';

export function TopBar({ role }: { role: 'farmer' | 'citizen' }) {
  const { t } = useT();
  const dashboardPath = role === 'farmer' ? '/farmer' : '/citizen';

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[var(--bg-0)]/80 backdrop-blur-md h-16 flex items-center px-4 md:px-6">
      <div className="flex-1 flex items-center gap-3">
        <Logo size={32} href={dashboardPath} />
        <span className="font-semibold text-text-primary hidden sm:block">
          {role === 'farmer' ? t('farmer.dashboard') : t('citizen.dashboard')}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <ProfileMenu role={role} />
      </div>
    </header>
  );
}
