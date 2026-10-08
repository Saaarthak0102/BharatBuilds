'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { TodayResponse } from '@/lib/types';
import { SampleDataBadge } from '@/components/common/SampleDataBadge';
import { useT } from '@/lib/i18n/useT';

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

  // Helper to map category to class
  const getBadgeClass = (cat?: string) => {
    if (!cat) return 'bg-gray-200';
    return `aqi-${cat.toLowerCase().replace(' ', '-')}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Data Panel */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-text-primary">{t('citizen.today')}</h1>
          {today?.is_sample && <SampleDataBadge />}
        </div>

        {loading ? (
          <Card className="h-64 flex items-center justify-center">
            <p className="text-text-muted">{t('common.loading')}</p>
          </Card>
        ) : (
          <>
            <Card className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                     <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${getBadgeClass(today?.aqi_category)}`}>
                       {today?.aqi_category}
                     </span>
                     <span className="text-sm text-text-muted">{today?.area_name}</span>
                   </div>
                   <div className="text-6xl font-black tracking-tighter" style={{ color: today?.aqi_color }}>
                     {today?.aqi}
                   </div>
                   <p className="text-sm font-bold text-text-secondary mt-1">AQI (PM2.5)</p>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-sky-50 rounded-xl border border-sky-100">
                <h3 className="font-bold text-sky-900 mb-1 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('citizen.aqiAdvice')}
                </h3>
                <p className="text-sky-800 text-sm leading-relaxed">{today?.advice}</p>
              </div>
              
              <div className="mt-6 flex items-start gap-3 p-4 border border-border rounded-xl">
                 <div className="text-xl">💨</div>
                 <div>
                   <p className="font-medium text-sm text-text-primary">{today?.wind.description}</p>
                   <p className="text-xs text-text-secondary mt-1">{today?.smoke_drift_note}</p>
                 </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Right Column: Action Tiles */}
      <div className="lg:col-span-5">
        <div className="grid grid-cols-2 gap-4">
          <Card className="col-span-2 cursor-pointer hover:border-error transition-colors bg-white hover:bg-red-50 group border-2 border-transparent">
            <h3 className="font-bold text-error flex items-center justify-between">
              {t('citizen.reportBurning')}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </h3>
            <p className="text-sm text-red-700/80 mt-1">Spot a fire? Send a photo to alert authorities.</p>
          </Card>
          
          <Card className="cursor-pointer hover:border-sky-500 transition-colors">
             <div className="text-2xl mb-2">🤖</div>
             <h3 className="font-bold text-text-primary text-sm">{t('citizen.askAboutToday')}</h3>
          </Card>
          
          <Card className="cursor-pointer hover:border-sky-500 transition-colors">
             <div className="text-2xl mb-2">🗺️</div>
             <h3 className="font-bold text-text-primary text-sm">Map</h3>
          </Card>
          
           <Card className="col-span-2 cursor-pointer hover:border-sky-500 transition-colors">
             <h3 className="font-bold text-text-primary text-sm">{t('citizen.alertSettings')}</h3>
             <p className="text-xs text-text-secondary mt-1">Get notified when AQI drops below your threshold</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
