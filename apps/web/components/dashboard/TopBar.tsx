'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useT } from '@/lib/i18n/useT';
import { useSession } from '@/lib/auth/useSession';

export function TopBar({ role }: { role: 'farmer' | 'citizen' }) {
  const { t } = useT();
  const { logout, session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const initial = session?.name ? session.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[var(--bg-0)]/80 backdrop-blur-md h-16 flex items-center px-4 md:px-6">
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
        {/* Profile Avatar / Sign out */}
        <button
          onClick={handleLogout}
          title="Sign out"
          className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-medium hover:opacity-80 transition-opacity cursor-pointer text-xs"
        >
          {initial}
        </button>
      </div>
    </header>
  );
}
