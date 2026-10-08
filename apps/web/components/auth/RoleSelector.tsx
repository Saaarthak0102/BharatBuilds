'use client';

import { Role } from '@/lib/types';
import { GlassCard } from '../ui/GlassCard';

export function RoleSelector({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <div className="space-y-4 w-full">
      <h2 className="text-xl font-bold text-center text-[var(--text-hi)] mb-6">Choose your role</h2>
      
      <button 
        onClick={() => onSelect('farmer')}
        className="w-full block text-left group"
      >
        <GlassCard className="hover:border-[var(--emerald)]/50 transition-colors cursor-pointer group-hover:bg-[var(--emerald)]/5">
          <div className="flex items-center gap-4">
            <div className="text-3xl bg-[var(--bg-1)] w-12 h-12 rounded-full flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--emerald)]/30">🚜</div>
            <div>
              <h3 className="font-bold text-[var(--text-hi)] text-lg group-hover:text-[var(--emerald)] transition-colors">Farmer in Punjab</h3>
              <p className="text-sm text-[var(--text-mid)] mt-1">Get field clearing advice and book machinery</p>
            </div>
          </div>
        </GlassCard>
      </button>

      <button 
        onClick={() => onSelect('citizen')}
        className="w-full block text-left group"
      >
        <GlassCard className="hover:border-[var(--cyan)]/50 transition-colors cursor-pointer group-hover:bg-[var(--cyan)]/5">
          <div className="flex items-center gap-4">
            <div className="text-3xl bg-[var(--bg-1)] w-12 h-12 rounded-full flex items-center justify-center border border-[var(--border)] group-hover:border-[var(--cyan)]/30">🏙️</div>
            <div>
              <h3 className="font-bold text-[var(--text-hi)] text-lg group-hover:text-[var(--cyan)] transition-colors">Delhi NCR Citizen</h3>
              <p className="text-sm text-[var(--text-mid)] mt-1">Check AQI, report burning, and get alerts</p>
            </div>
          </div>
        </GlassCard>
      </button>
    </div>
  );
}
