'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PillButton } from '@/components/ui/PillButton';
import { IconTile } from '@/components/ui/IconTile';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { apiClient } from '@/lib/api/client';
import { PlanResult } from '@/lib/types';
import { useT } from '@/lib/i18n/useT';
import { LuCalendar, LuTractor, LuMap, LuInfo, LuArrowRight } from 'react-icons/lu';

export default function FarmerDashboard() {
  const { t } = useT();
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.farmer.plan({
          village_id: 'village-patiala-001',
          crop_stage: 'harvested',
          language: 'en'
        });
        setPlan(res.data);
      } catch (err) {
        console.error('Failed to load plan', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Left Column: Main Status */}
      <div className="xl:col-span-7 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">{t('farmer.myField')}</h1>
          {plan?.is_sample && <SampleDataBadge />}
        </div>
        
        {loading ? (
          <GlassCard className="h-64 flex items-center justify-center">
            <p className="text-[var(--text-mid)] animate-pulse">{t('common.loading')}</p>
          </GlassCard>
        ) : (
          <>
            <GlassCard spotlight className="border border-[var(--emerald)]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--emerald)]/10 blur-[80px] rounded-full" />
              
              <div className="relative z-10">
                <Chip variant="accent" className="bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20 mb-4">
                  {t('farmer.bestDay')}
                </Chip>
                
                <div className="text-4xl md:text-5xl font-serif italic text-[var(--text-hi)] mb-6">
                  {plan?.best_day ? new Date(plan.best_day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'N/A'}
                </div>
                
                <p className="text-lg md:text-xl text-[var(--text-hi)] leading-relaxed bg-[var(--bg-1)] p-5 rounded-2xl border border-[var(--border)] mb-8">
                  {plan?.reason_text}
                </p>
                
                {plan?.machine_option && (
                  <div className="flex items-center gap-4 bg-[var(--bg-0)] p-4 rounded-xl border border-[var(--border)]">
                    <div className="w-12 h-12 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] text-xl shrink-0">
                      <LuTractor />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-hi)]">{plan.machine_option.machine_type} Available</h3>
                      <p className="text-sm text-[var(--text-mid)]">{plan.machine_option.owner_label}</p>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-semibold text-[var(--text-hi)] mb-4">{t('farmer.agentTrace')}</h3>
              <div className="space-y-3 font-mono text-xs">
                {plan?.tool_trace.map((trace, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-[var(--bg-1)] border border-[var(--border)]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--emerald)]"></span>
                      <span className="text-[var(--text-mid)]">{trace.tool}</span>
                    </span>
                    <span className="text-[var(--text-low)]">{trace.latency_ms}ms</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </>
        )}
      </div>

      {/* Right Column: Actions */}
      <div className="xl:col-span-5">
        <h2 className="text-sm font-bold text-[var(--text-mid)] uppercase tracking-widest mb-6">Actions</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="col-span-2 group cursor-pointer hover:border-[var(--emerald)]/50 transition-colors">
            <h3 className="font-bold text-[var(--emerald)] group-hover:text-emerald-400 flex items-center justify-between text-lg mb-2 transition-colors">
              {t('farmer.bookMachine')}
              <LuArrowRight className="w-5 h-5" />
            </h3>
            <p className="text-sm text-[var(--text-mid)]">Secure a slot for your field without burning.</p>
          </GlassCard>
          
          <IconTile 
            icon={<LuMap className="w-6 h-6" />}
            label={t('farmer.strawOutlets')}
            className="hover:border-[var(--emerald)]/50 text-[var(--text-hi)]"
          />
          
          <IconTile 
            icon={<LuCalendar className="w-6 h-6" />}
            label="Planner"
            className="hover:border-[var(--emerald)]/50 text-[var(--text-hi)]"
          />
          
          <GlassCard className="col-span-2 group cursor-pointer hover:border-[var(--emerald)]/50 transition-colors">
            <div className="flex items-center gap-3">
              <LuInfo className="w-5 h-5 text-[var(--text-mid)] group-hover:text-[var(--emerald)] transition-colors" />
              <div>
                <h3 className="font-bold text-[var(--text-hi)] text-sm">{t('farmer.subsidyInfo')}</h3>
                <p className="text-xs text-[var(--text-mid)] mt-1">Learn about state support for machinery</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
