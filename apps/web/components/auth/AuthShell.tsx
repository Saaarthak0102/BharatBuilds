import { ReactNode } from 'react';
import Link from 'next/link';
import AccentGlow from '@/components/ui/AccentGlow';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-0)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <AccentGlow />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-hi)] font-serif italic text-2xl shadow-[0_0_20px_var(--accent-glow)] mb-4">
            S
          </Link>
          <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">Welcome to Saans</h1>
        </div>

        {children}
      </div>
    </div>
  );
}
