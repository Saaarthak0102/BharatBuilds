import { ReactNode } from 'react';
import Link from 'next/link';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useT } from '@/lib/i18n/useT';

export function TopBar({ role }: { role: 'farmer' | 'citizen' }) {
  const { t } = useT();
  
  return (
    <header className="sticky top-0 z-sticky glass-navbar h-16 flex items-center px-4 md:px-6">
      <div className="flex-1 flex items-center gap-3">
        <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-brand text-white font-bold shadow-md">
          S
        </Link>
        <span className="font-semibold text-text-primary hidden sm:block">
          {role === 'farmer' ? t('farmer.dashboard') : t('citizen.dashboard')}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        {/* Profile Menu Stub */}
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-medium">
          U
        </div>
      </div>
    </header>
  );
}
