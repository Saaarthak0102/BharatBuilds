'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isDemoMode, getDemoRole, clearDemoSession, demoStatusTracker, FeatureStatus } from '@/lib/demo';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip } from '@/components/ui/Chip';
import { LuCheck, LuSparkles, LuX, LuChevronUp, LuLogOut, LuRefreshCw } from 'react-icons/lu';

export function DemoStatus() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [role, setRole] = useState<'farmer' | 'citizen' | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, FeatureStatus>>({});

  useEffect(() => {
    setMounted(true);
    const checkDemo = () => {
      const isDemo = isDemoMode();
      setActive(isDemo);
      setRole(getDemoRole());
    };

    checkDemo();
    const unsubscribe = demoStatusTracker.subscribe((latest) => {
      setStatuses(latest);
    });

    // Check on storage events
    window.addEventListener('storage', checkDemo);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', checkDemo);
    };
  }, []);

  if (!mounted || !active) return null;

  const handleExitDemo = () => {
    clearDemoSession();
    setActive(false);
    setIsOpen(false);
    router.push('/');
  };

  const featureList = Object.values(statuses);

  return (
    <aside aria-label="Demo mode status controller" className="fixed bottom-4 right-4 z-50 font-sans">
      {isOpen ? (
        <GlassCard
          data-accent="amber"
          className="w-80 sm:w-96 p-4 rounded-2xl shadow-2xl border border-amber-500/30 backdrop-blur-xl bg-[var(--bg-0)]/90 text-white animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                Demo Mode Active
              </span>
              {role && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-mid)] capitalize">
                  {role}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close demo status panel"
              className="text-[var(--text-low)] hover:text-[var(--text-hi)] transition-colors p-1"
            >
              <LuX className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-2 max-h-64 overflow-y-auto pr-1">
            <div className="text-[11px] text-[var(--text-low)] font-medium mb-1">
              Data Source Per Feature (Real First, Mock Fallback):
            </div>
            {featureList.map((f) => {
              const isLive = f.source === 'live';
              return (
                <div
                  key={f.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-1)]/80 border border-[var(--border)] text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-medium text-[var(--text-hi)] block truncate">{f.label}</span>
                    {f.details && (
                      <span className="text-[10px] text-[var(--text-low)] block truncate">{f.details}</span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 ${
                      isLive
                        ? 'text-[var(--emerald)] bg-[var(--emerald)]/10 border-[var(--emerald)]/30'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    {isLive ? <LuCheck className="w-3 h-3" /> : <LuSparkles className="w-3 h-3" />}
                    {isLive ? 'LIVE' : 'DEMO'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors px-2 py-1 rounded-md"
            >
              <LuRefreshCw className="w-3 h-3" />
              <span>Refresh data</span>
            </button>
            <button
              type="button"
              onClick={handleExitDemo}
              className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full transition-colors"
            >
              <LuLogOut className="w-3 h-3" />
              <span>Exit Demo</span>
            </button>
          </div>
        </GlassCard>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-1)]/90 hover:bg-[var(--bg-2)] border border-amber-500/40 hover:border-amber-400 shadow-lg backdrop-blur-md transition-all text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          title="Click to see live vs demo sources"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono font-bold tracking-wider text-amber-300 text-[11px]">DEMO</span>
          <span className="text-[10px] text-[var(--text-low)] group-hover:text-[var(--text-mid)] transition-colors">
            {role ? `(${role})` : ''}
          </span>
          <LuChevronUp className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}
    </aside>
  );
}
