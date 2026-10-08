'use client';

import { useEffect, useState, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { IconTile } from '@/components/ui/IconTile';
import { DashboardLeftCard } from '@/components/dashboard/DashboardLeftCard';
import { WeatherPanel } from '@/components/dashboard/WeatherPanel';
import { MiniStatCard } from '@/components/dashboard/MiniStatCard';
import { ActionCard } from '@/components/dashboard/ActionCard';
import { RecentList, RecentListItem } from '@/components/dashboard/RecentList';
import { AgentLogAccordion, ToolTraceItem } from '@/components/dashboard/AgentLogAccordion';
import { EmergencyFeelingHeavyModal } from '@/components/dashboard/EmergencyFeelingHeavyModal';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { apiClient } from '@/lib/api/client';
import { TodayResponse } from '@/lib/types';
import { useT } from '@/lib/i18n/useT';
import {
  MOCK_WEATHER_CITIZEN,
  FULL_WEATHER_CITIZEN,
  MOCK_RECENT_REPORTS,
  getCitizenRegionalImpact,
  DID_YOU_KNOW_FACTS,
} from '@/lib/mock/dashboardData';
import {
  LuCamera,
  LuMapPin,
  LuBell,
  LuArrowRight,
  LuWind,
  LuShieldAlert,
  LuHeartPulse,
  LuClock,
  LuFlame,
  LuLeaf,
  LuSparkles,
} from 'react-icons/lu';

export default function CitizenDashboard() {
  const { t } = useT();
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  // Rotating "Did you know?" facts
  const [factIndex, setFactIndex] = useState(0);
  const [isFactPaused, setIsFactPaused] = useState(false);
  const [isFactFading, setIsFactFading] = useState(false);

  // Tool traces for Citizen dashboard (AQI calculation + emergency actions)
  const [citizenToolTraces, setCitizenToolTraces] = useState<ToolTraceItem[]>([
    { tool: 'get_current_aqi', status: 'ok', latency_ms: 95 },
    { tool: 'get_cpcb_station_data', status: 'ok', latency_ms: 130 },
    { tool: 'get_dispersion_model', status: 'ok', latency_ms: 110 },
    { tool: 'get_wind_drift_vectors', status: 'ok', latency_ms: 85 },
  ]);

  // Aggregated regional impact (derived from collective farmer actions)
  const regionalImpact = getCitizenRegionalImpact();

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

  // Fact rotation effect: every 9 seconds with fade, paused on hover
  useEffect(() => {
    if (isFactPaused) return;

    const interval = setInterval(() => {
      setIsFactFading(true);
      setTimeout(() => {
        setFactIndex((prev) => (prev + 1) % DID_YOU_KNOW_FACTS.length);
        setIsFactFading(false);
      }, 300);
    }, 9000);

    return () => clearInterval(interval);
  }, [isFactPaused]);

  const getAqiColor = (cat?: string) => {
    if (cat === 'Severe') return 'var(--red)';
    if (cat === 'Very Poor') return '#EF4444';
    if (cat === 'Poor') return '#F97316';
    if (cat === 'Moderate') return 'var(--amber)';
    return 'var(--cyan)';
  };

  const reportListItems: RecentListItem[] = MOCK_RECENT_REPORTS.map((r) => ({
    id: r.id,
    title: r.category,
    subtitle: `${r.location} • ${r.time}`,
    status: r.status,
    statusType: r.status.toLowerCase().replace(/\s+/g, '_') as any,
    icon: <LuCamera className="w-3.5 h-3.5 text-amber-400" />,
  }));

  const handleToolTracesUpdated = (newTraces: ToolTraceItem[]) => {
    setCitizenToolTraces((prev) => [...prev, ...newTraces]);
  };

  return (
    <div className="w-full">
      <AmbientBackground accent="cyan" aqiCategory={today?.aqi_category} />
      {/* Emergency "Feeling heavy?" Modal Flow */}
      <EmergencyFeelingHeavyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        onToolTracesUpdated={handleToolTracesUpdated}
      />

      {/* ==================================================================== */}
      {/* MOBILE LAYOUT (strictly below lg breakpoint)                         */}
      {/* Structure, spacing and ordering preserved from previous mobile layout */}
      {/* Only allowed mobile changes:                                         */}
      {/* (a) Agent log becomes collapsible dropdown accordion                 */}
      {/* (b) "Feeling heavy" button added in the actions section              */}
      {/* ==================================================================== */}
      <div className="lg:hidden p-4 md:p-6 space-y-6">
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
            <GlassCard data-accent="cyan" className="border border-[var(--cyan)]/20 relative overflow-hidden">
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

            <GlassCard data-accent="cyan">
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

            {/* Mobile Agent Log: collapsible accordion */}
            <AgentLogAccordion
              accent="cyan"
              toolTraces={citizenToolTraces}
              title={t('citizen.agentTrace')}
            />
          </>
        )}

        {/* Mobile Right Column: Citizen Actions */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-mid)] uppercase tracking-widest mb-6">Actions</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <GlassCard data-accent="red" className="col-span-2 group interactive-card hover:border-[var(--red)]/50 border-[var(--red)]/20">
              <h3 className="font-bold text-[var(--red)] group-hover:text-[var(--accent-2)] flex items-center justify-between text-lg mb-2">
                {t('citizen.reportBurning')}
                <LuCamera className="w-5 h-5" />
              </h3>
              <p className="text-sm text-[var(--text-mid)]">{t('citizen.reportBurningDesc')}</p>
            </GlassCard>
            
            <IconTile 
              data-accent="violet"
              icon={<LuMapPin className="w-6 h-6" />}
              label={t('citizen.mapView')}
              className="hover:border-[var(--violet)]/50"
            />
            
            <IconTile 
              data-accent="cyan"
              icon={<LuBell className="w-6 h-6" />}
              label={t('citizen.alertSettings')}
              className="hover:border-[var(--cyan)]/50"
            />

            {/* Mobile "Feeling heavy?" emergency button */}
            <button
              type="button"
              onClick={() => setIsEmergencyOpen(true)}
              className="col-span-2 p-4 rounded-2xl bg-gradient-to-r from-red-950/60 to-[var(--bg-1)] border border-[var(--red)]/40 hover:border-[var(--red)] text-left flex items-center justify-between group interactive-card shadow-lg shadow-red-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--red)]/20 flex items-center justify-center text-[var(--red)] shrink-0">
                  <LuHeartPulse className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--red)] group-hover:text-red-300 text-base">
                    {t('citizen.feelingHeavy')}
                  </h3>
                  <p className="text-xs text-[var(--text-mid)]">
                    {t('citizen.troubleBreathing')}
                  </p>
                </div>
              </div>
              <LuArrowRight className="w-5 h-5 text-[var(--red)] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* DESKTOP LAYOUT (lg breakpoint and up)                                 */}
      {/* Fits in exactly h-[calc(100dvh-4rem)] with NO internal or page scroll */}
      {/* Left card: 7/12, Right column: 5/12. No empty space at bottom        */}
      {/* ==================================================================== */}
      <div className="hidden lg:flex lg:flex-col lg:min-h-0 w-full max-w-7xl mx-auto px-4 lg:px-6">
        <div className="h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] py-3 sm:py-3.5 lg:py-4 flex flex-col min-h-0">
          <div className="grid grid-cols-12 gap-4 xl:gap-5 flex-1 min-h-0">
            {/* ─── Left Column (7/12): Today Hero Card ─── */}
            <div className="col-span-7 h-full min-h-0 flex flex-col">
              <DashboardLeftCard
                accent="cyan"
                weatherPanel={
                  <WeatherPanel
                    weather={FULL_WEATHER_CITIZEN}
                    title={t('citizen.today')}
                    location={t('citizen.location')}
                    dateText="Today, 10:15 AM"
                    isSample={today?.is_sample ?? true}
                    accent="cyan"
                  />
                }
                heroContent={
                  <div className="bg-[var(--bg-1)]/60 rounded-xl p-5 border border-[var(--border)] h-full min-h-0 grid grid-cols-[auto_1fr] items-center gap-6">
                    {/* Compact AQI Circular Ring */}
                    <div
                      className="w-[clamp(110px,15vh,150px)] h-[clamp(110px,15vh,150px)] rounded-full border-[6px] lg:border-[8px] flex flex-col items-center justify-center relative shrink-0"
                      style={{ borderColor: `${getAqiColor(today?.aqi_category)}35` }}
                    >
                      <div
                        className="absolute inset-0 rounded-full border-[6px] lg:border-[8px] border-t-transparent border-r-transparent transform -rotate-45"
                        style={{ borderColor: getAqiColor(today?.aqi_category) }}
                      />
                      <span className="text-[clamp(2.5rem,5vh,4rem)] font-serif italic text-[var(--text-hi)] leading-none mb-1">
                        {today?.aqi || 185}
                      </span>
                      <span
                        className="text-[clamp(0.6rem,1.2vh,0.85rem)] font-bold uppercase tracking-wider"
                        style={{ color: getAqiColor(today?.aqi_category) }}
                      >
                        {today?.aqi_category || 'POOR'}
                      </span>
                    </div>

                    {/* Health Advice limited to 2 lines */}
                    <div className="flex flex-col min-w-0">
                      <div className="text-xs lg:text-[clamp(0.7rem,1.5vh,0.9rem)] font-semibold uppercase tracking-wider text-[var(--cyan)] mb-1 flex items-center gap-1.5">
                        <LuWind className="w-3.5 h-3.5" />
                        <span>Health & Exposure Advice</span>
                      </div>
                      <p className="text-sm lg:text-[clamp(0.85rem,1.8vh,1.1rem)] text-[var(--text-hi)] line-clamp-3 leading-snug lg:leading-relaxed">
                        {today?.advice ||
                          'Sensitive groups should reduce prolonged outdoor exertion. Wear an N95 mask outside and keep indoor air purifiers running.'}
                      </p>
                      <div className="text-[11px] lg:text-[clamp(0.7rem,1.5vh,0.85rem)] text-[var(--text-low)] mt-2 lg:mt-3 flex items-center gap-2">
                        <span>NW wind 12 km/h</span>
                        <span>•</span>
                        <span className="truncate">Residual agricultural smoke in basin</span>
                      </div>
                    </div>
                  </div>
                }
                miniStatsGrid={
                  <div className="grid grid-cols-2 auto-rows-fr gap-3.5 h-full">
                    {/* 1. Burning stopped today (Summed from collective farmer actions) */}
                    <MiniStatCard
                      label={t('citizen.burningStoppedToday')}
                      accent="emerald"
                      icon={<LuFlame className="w-3.5 h-3.5 text-[var(--emerald)]" />}
                      value={`${regionalImpact.fieldsNotBurnedToday} fields`}
                      caption={`${regionalImpact.strawDivertedTodayTonnes} t stubble diverted`}
                    />

                    {/* 2. Saved today (Same constants as farmer side) */}
                    <MiniStatCard
                      label={t('citizen.savedToday')}
                      accent="cyan"
                      badge="est."
                      icon={<LuLeaf className="w-3.5 h-3.5 text-[var(--cyan)]" />}
                      value={`${regionalImpact.pm25AvoidedKg.toLocaleString()} kg PM2.5`}
                      caption={`${regionalImpact.co2AvoidedTonnes} t CO₂ kept out`}
                    />

                    {/* 3. Did you know? (Rotating facts with fade & pause on hover) */}
                    <div
                      onMouseEnter={() => setIsFactPaused(true)}
                      onMouseLeave={() => setIsFactPaused(false)}
                      className="cursor-pointer"
                    >
                      <MiniStatCard
                        label={t('citizen.didYouKnow')}
                        accent="amber"
                        icon={<LuSparkles className="w-3.5 h-3.5 text-amber-400" />}
                      >
                        <div
                          className={`text-xs text-[var(--text-hi)] line-clamp-3 leading-tight transition-opacity duration-300 ${
                            isFactFading ? 'opacity-0' : 'opacity-100'
                          }`}
                        >
                          "{DID_YOU_KNOW_FACTS[factIndex]}"
                        </div>
                        <div className="text-[10px] text-[var(--text-low)] mt-1">
                          Fact {factIndex + 1} of {DID_YOU_KNOW_FACTS.length} (Hover to pause)
                        </div>
                      </MiniStatCard>
                    </div>

                    {/* 4. Best time outside today */}
                    <MiniStatCard
                      label={t('citizen.bestTimeOutside')}
                      accent="blue"
                      icon={<LuClock className="w-3.5 h-3.5 text-cyan-400" />}
                      value="1:30 PM – 4:00 PM"
                      caption="Cleanest daylight window (AQI ~140)"
                    />
                  </div>
                }
              />
            </div>

            {/* ─── Right Column (5/12): Citizen Actions ─── */}
            <div className="col-span-5 h-full min-h-0 flex flex-col justify-between">
              <div className="flex items-center justify-between shrink-0 mb-2">
                <h2 className="text-xs font-bold text-[var(--text-mid)] uppercase tracking-widest">
                  {t('common.actions')}
                </h2>
                <span className="text-[11px] text-[var(--text-low)]">Local Action</span>
              </div>

              <div className="flex-1 min-h-0 flex flex-col gap-4">
                {/* 1. Extended "Report burning" card with My Recent Reports */}
                <ActionCard
                  title={t('citizen.reportBurning')}
                  description={t('citizen.reportBurningDesc')}
                  accent="amber"
                  icon={<LuCamera className="w-4 h-4 text-amber-400" />}
                  className="flex-[3] min-h-0 flex flex-col justify-between"
                >
                  <div className="flex flex-col flex-1 justify-between min-h-0 mt-3 sm:mt-4">
                    {/* NEW compact quick upload strip */}
                    <button className="shrink-0 h-[56px] sm:h-[64px] lg:h-[72px] rounded-xl border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--amber)]/50 bg-[var(--bg-2)] flex items-center justify-center gap-3 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors group mb-3 sm:mb-4">
                      <LuCamera className="w-5 h-5 text-amber-500/70 group-hover:text-amber-400" />
                      <span className="text-xs sm:text-sm font-medium">Tap to snap and upload a photo, location is auto-tagged</span>
                    </button>

                    {/* NEW stats row chips */}
                    <div className="shrink-0 flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded bg-[var(--bg-2)] border border-[var(--border)]">Reports: 3</span>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Verified: 2</span>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Action taken: 1</span>
                    </div>

                    <div className="flex-1 overflow-hidden min-h-0 flex flex-col justify-end">
                      <RecentList
                        title={t('citizen.recentReports')}
                        items={reportListItems}
                        totalCount={MOCK_RECENT_REPORTS.length}
                        emptyText={t('citizen.noReports')}
                      />
                    </div>
                  </div>
                </ActionCard>

                {/* 2. Row of two tiles: Map View & Alert Settings */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0 flex-1 min-h-[5.5rem]">
                  <IconTile
                    data-accent="violet"
                    icon={<LuMapPin className="w-5 h-5 text-[var(--violet)]" />}
                    label={t('citizen.mapView')}
                    sublabel="Delhi NCR & Fires"
                    className="hover:border-[var(--violet)]/50 p-4"
                  />
                  <IconTile
                    data-accent="cyan"
                    icon={<LuBell className="w-5 h-5 text-[var(--cyan)]" />}
                    label={t('citizen.alertSettings')}
                    sublabel="Threshold 200 AQI"
                    className="hover:border-[var(--cyan)]/50 p-4"
                  />
                </div>

                {/* 3. NEW: Emergency Card "Feeling heavy?" (red/amber accent, distinct) */}
                <button
                  type="button"
                  onClick={() => setIsEmergencyOpen(true)}
                  className="shrink-0 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-red-950/80 via-[var(--bg-1)] to-[var(--bg-2)] border border-[var(--red)]/40 hover:border-[var(--red)]/80 text-left flex items-center justify-between group interactive-card shadow-lg shadow-red-950/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--red)]/20 border border-[var(--red)]/40 flex items-center justify-center text-[var(--red)] shrink-0 group-hover:scale-105 transition-transform">
                      <LuHeartPulse className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[var(--red)] group-hover:text-red-300 text-sm sm:text-base leading-tight">
                          {t('citizen.feelingHeavy')}
                        </h3>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[var(--red)]/20 text-red-200 border border-[var(--red)]/30">
                          Rapid Help
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-mid)] truncate mt-0.5">
                        {t('citizen.troubleBreathing')}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[var(--red)] group-hover:translate-x-1 transition-transform shrink-0 ml-2">
                    <LuArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Below Dashboard: Full-width Agent Log Accordion (reached by scroll) ─── */}
        <div className="w-full pt-4 pb-12">
          <AgentLogAccordion
            accent="cyan"
            toolTraces={citizenToolTraces}
            title={t('citizen.agentTrace')}
          />
        </div>
      </div>
    </div>
  );
}
