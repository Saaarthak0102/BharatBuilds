'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useSession } from '@/lib/auth/useSession';
import { getDashboardPath } from '@/lib/auth/roleRedirect';

export default function CitizenLayout({ children }: { children: ReactNode }) {
  const { session, loading, isAuthenticated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !session) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("saans_signed_out");
        }
        router.replace("/login");
      } else if (session.role !== 'citizen') {
        router.replace(getDashboardPath(session.role));
      }
    }
  }, [loading, isAuthenticated, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-0)] text-[var(--text-mid)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || session?.role !== 'citizen') {
    return null;
  }

  return <DashboardShell role="citizen">{children}</DashboardShell>;
}
