'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PillButton } from '@/components/ui/PillButton';
import { IconTile } from '@/components/ui/IconTile';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { apiClient } from '@/lib/api/client';
import { TodayResponse } from '@/lib/types';
import { useT } from '@/lib/i18n/useT';
import { LuCamera, LuMapPin, LuBell, LuArrowRight, LuWind } from 'react-icons/lu';

export default function CitizenDashboard() {
  const { t } = useT();
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.citizen.today('ward-east-delhi-001');
        setToday(res.data);
      } catch (err) {
        console.error('Failed to load today data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getAqiColor = (cat?: string) => {
    if (cat === 'Severe') return 'var(--red)';
    if (cat === 'Very Poor') return 'var(--orange-500)';
    if (cat === 'Poor') return 'var(--amber)';
    return 'var(--cyan)';
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Left Column: Today's Air */}
      <div className="xl:col-span-7 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">{t('citizen.today')}</h1>
          {today?.is_sample && <SampleDataBadge />}
        </div>
        
        {loading ? (
          <GlassCard className="h-64 flex items-center justify-center">
            <p className="text-[var(--text-mid)] animate-pulse">{t('common.loading')}</p>
          </GlassCard>
        ) : (
          <>
            <GlassCard spotlight className="border border-[var(--cyan)]/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-[var(--cyan)]/10 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center text-center py-8">
                <Chip className="bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20 mb-8 px-4 py-1">
                  East Delhi
                </Chip>
                
                {/* Huge AQI Display */}
                <div 
                  className="w-48 h-48 rounded-full border-[6px] flex flex-col items-center justify-center mb-8 relative"
                  style={{ borderColor: `${getAqiColor(today?.aqi_category)}40` }}
                >
                  <div 
                    className="absolute inset-0 rounded-full border-[6px] border-t-transparent border-r-transparent transform -rotate-45"
                    style={{ borderColor: getAqiColor(today?.aqi_category) }}
                  />
                  <span className="text-6xl font-serif italic text-[var(--text-hi)] leading-none mb-2">{today?.aqi}</span>
                  <span 
                    className="text-sm font-bold uppercase tracking-widest"
                    style={{ color: getAqiColor(today?.aqi_category) }}
                  >
                    {today?.aqi_category}
                  </span>
                </div>
                
                <p className="text-xl text-[var(--text-hi)] leading-relaxed max-w-sm mx-auto bg-[var(--bg-1)] p-4 rounded-2xl border border-[var(--border)]">
                  {today?.advice}
                </p>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <LuWind className="text-[var(--cyan)] w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-hi)] mb-1">Wind & Forecast</h3>
                  <p className="text-sm text-[var(--text-mid)]">
                    Winds are currently blowing from the northwest at 12km/h, bringing residual smoke into the NCR basin.
                  </p>
                </div>
              </div>
            </GlassCard>
          </>
        )}
      </div>

      {/* Right Column: Citizen Actions */}
      <div className="xl:col-span-5">
        <h2 className="text-sm font-bold text-[var(--text-mid)] uppercase tracking-widest mb-6">Actions</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="col-span-2 group cursor-pointer hover:border-[var(--red)]/50 transition-colors border-[var(--red)]/20 bg-[var(--red)]/5">
            <h3 className="font-bold text-[var(--red)] group-hover:text-red-400 flex items-center justify-between text-lg mb-2 transition-colors">
              {t('citizen.reportBurning')}
              <LuCamera className="w-5 h-5" />
            </h3>
            <p className="text-sm text-[var(--text-mid)]">Spot an illegal fire? Upload a quick photo to alert local response agents instantly.</p>
          </GlassCard>
          
          <IconTile 
            icon={<LuMapPin className="w-6 h-6" />}
            label="Map View"
            className="hover:border-[var(--cyan)]/50 text-[var(--text-hi)]"
          />
          
          <IconTile 
            icon={<LuBell className="w-6 h-6" />}
            label={t('citizen.alertSettings')}
            className="hover:border-[var(--cyan)]/50 text-[var(--text-hi)]"
          />
        </div>
      </div>
    </div>
  );
}
