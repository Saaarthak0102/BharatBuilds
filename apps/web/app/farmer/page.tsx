'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api/client';
import { PlanResult } from '@/lib/types';
import { SampleDataBadge } from '@/components/common/SampleDataBadge';
import { useT } from '@/lib/i18n/useT';

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Data Panel (60%) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-text-primary">{t('farmer.myField')}</h1>
          {plan?.is_sample && <SampleDataBadge />}
        </div>
        
        {loading ? (
          <Card className="h-64 flex items-center justify-center">
            <p className="text-text-muted">{t('common.loading')}</p>
          </Card>
        ) : (
          <>
            <Card className="bg-gradient-warm border-brand-200 shadow-md">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
                {t('farmer.bestDay')}
              </h2>
              <div className="text-4xl font-extrabold text-brand-700 mb-4">
                {plan?.best_day ? new Date(plan.best_day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'N/A'}
              </div>
              <p className="text-text-primary text-lg leading-relaxed bg-white/50 p-4 rounded-xl border border-white">
                {plan?.reason_text}
              </p>
              
              {plan?.machine_option && (
                <div className="mt-6 pt-6 border-t border-brand-100 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-2xl flex-shrink-0">
                    🚜
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">{plan.machine_option.machine_type} Available</h3>
                    <p className="text-sm text-text-secondary">{plan.machine_option.owner_label}</p>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-bold text-text-primary mb-4">{t('farmer.agentTrace')}</h3>
              <div className="space-y-3">
                {plan?.tool_trace.map((trace, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-400"></span>
                      <code className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-xs">{trace.tool}</code>
                    </span>
                    <span className="text-text-muted">{trace.latency_ms}ms</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Right Column: Action Tiles (40%) */}
      <div className="lg:col-span-5">
        <div className="grid grid-cols-2 gap-4">
          <Card className="col-span-2 cursor-pointer hover:border-brand-500 transition-colors group">
            <h3 className="font-bold text-brand-700 group-hover:text-brand-900 flex items-center justify-between">
              {t('farmer.bookMachine')}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </h3>
            <p className="text-sm text-text-secondary mt-1">Secure a slot for your field</p>
          </Card>
          
          <Card className="cursor-pointer hover:border-brand-500 transition-colors">
             <div className="text-2xl mb-2">🌾</div>
             <h3 className="font-bold text-text-primary text-sm">{t('farmer.strawOutlets')}</h3>
          </Card>
          
          <Card className="cursor-pointer hover:border-brand-500 transition-colors">
             <div className="text-2xl mb-2">🗺️</div>
             <h3 className="font-bold text-text-primary text-sm">Map</h3>
          </Card>
          
           <Card className="col-span-2 cursor-pointer hover:border-brand-500 transition-colors">
             <h3 className="font-bold text-text-primary text-sm">{t('farmer.subsidyInfo')}</h3>
             <p className="text-xs text-text-secondary mt-1">Learn about state support for machinery</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
