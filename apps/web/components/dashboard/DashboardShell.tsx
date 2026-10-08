'use client';

import { ReactNode } from 'react';
import { TopBar } from './TopBar';

interface DashboardShellProps {
  children: ReactNode;
  role: 'farmer' | 'citizen';
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-sand-200)] flex flex-col">
      <TopBar role={role} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
      
      {/* Mobile Bottom Nav stub */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-sticky">
        <button className="flex flex-col items-center text-brand-600">
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-medium mt-1">Home</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-xl">🗺️</span>
          <span className="text-[10px] font-medium mt-1">Map</span>
        </button>
      </div>
      
      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden"></div>
    </div>
  );
}
