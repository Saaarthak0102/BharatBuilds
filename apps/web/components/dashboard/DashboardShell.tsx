'use client';

import { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { LuHouse, LuMap } from 'react-icons/lu';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: ReactNode;
  role: 'farmer' | 'citizen';
  className?: string;
}

export function DashboardShell({ children, role, className }: DashboardShellProps) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <TopBar role={role} />
      
      <main className={cn('flex-1 w-full mx-auto relative z-10 flex flex-col', className)}>
        {children}
      </main>
      
      {/* Mobile Bottom Nav stub */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-1)]/80 backdrop-blur-md border-t border-[var(--border)] flex items-center justify-around z-[var(--z-sticky)]">
        <Link href={role === 'farmer' ? '/farmer' : '/citizen'} className="flex flex-col items-center text-[var(--accent)] interactive-quiet">
          <LuHouse className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/map" className="flex flex-col items-center text-[var(--text-low)] interactive-quiet">
          <LuMap className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Map</span>
        </Link>
      </div>
      
      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
