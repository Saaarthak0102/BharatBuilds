'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import AccentGlow from '@/components/ui/AccentGlow';
import { Logo } from '@/components/common/Logo';
import { clearDemoSession } from '@/lib/demo';

export function AuthShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    clearDemoSession();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-0)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <AccentGlow />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" aria-label="Saans home" className="inline-flex items-center justify-center mb-4">
            <Logo size={44} withWordmark priority />
          </Link>
          <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">Welcome to Saans</h1>
        </div>

        {children}
      </div>
    </div>
  );
}
