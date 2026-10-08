import { ReactNode } from 'react';
import Link from 'next/link';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-sand-200)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/40 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-brand text-white font-bold text-2xl shadow-lg mb-4">
            S
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Welcome to Saans</h1>
        </div>

        {children}
      </div>
    </div>
  );
}
