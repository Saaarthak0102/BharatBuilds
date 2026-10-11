"use client";

import * as React from "react";
import { PillButton } from "./PillButton";
import { Logo } from "@/components/common/Logo";
import { useSession } from "@/lib/auth/useSession";

export function TopBar() {
  const { session } = useSession();
  const [demoRole, setDemoRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDemoRole(localStorage.getItem('saans_demo'));
  }, []);

  const isAuthed = Boolean(session?.role || demoRole);
  const dashboardPath = session?.role === 'farmer' || demoRole === 'farmer' ? '/farmer' : '/citizen';

  return (
    <header className="sticky top-0 left-0 right-0 z-[var(--z-sticky)] border-b border-[var(--border)] bg-[var(--bg-0)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo size={32} withWordmark priority href={isAuthed ? dashboardPath : "/"} />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            {isAuthed ? (
              <PillButton href={dashboardPath} variant="accent" size="md">
                Dashboard
              </PillButton>
            ) : (
              <>
                <PillButton href="/login" variant="glass" size="md">Log in</PillButton>
                <PillButton href="/signup" variant="primary-silver" size="md">Sign up</PillButton>
              </>
            )}
          </div>
          
          <button className="md:hidden p-2 text-[var(--text-mid)] interactive-quiet" aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
