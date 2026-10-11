'use client';

import Link from 'next/link';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { Logo } from '../common/Logo';
import { useT } from '@/lib/i18n/useT';
import { ProfileMenu } from './ProfileMenu';

export function TopBar({ role }: { role: 'farmer' | 'citizen' }) {
  const { t } = useT();

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[var(--bg-0)]/80 backdrop-blur-md h-16 flex items-center px-4 md:px-6">
      <div className="flex-1 flex items-center gap-3">
        <Link href="/" aria-label="Saans home" className="flex items-center justify-center w-8 h-8">
          <Logo size={32} />
        </Link>
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
