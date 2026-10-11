'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { IconTile } from '@/components/ui/IconTile';
import { DashboardLeftCard } from '@/components/dashboard/DashboardLeftCard';
import { WeatherPanel } from '@/components/dashboard/WeatherPanel';
import { MiniStatCard } from '@/components/dashboard/MiniStatCard';
import { ActionCard } from '@/components/dashboard/ActionCard';
import { RecentList, RecentListItem } from '@/components/dashboard/RecentList';
import { AgentLogAccordion, ToolTraceItem } from '@/components/dashboard/AgentLogAccordion';
import { EmergencyFeelingHeavyModal } from '@/components/dashboard/EmergencyFeelingHeavyModal';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { ReportCardModal } from '@/components/citizen/ReportCardModal';
import { AlertBanner } from '@/components/citizen/AlertBanner';
import { apiClient } from '@/lib/api/client';
import { isDemoMode, getDemoToday, getDemoWeather } from '@/lib/demo';
import { TodayResponse, CitizenProfile, WeatherResponse, CommunityReport } from '@/lib/types';
import { useT } from '@/lib/i18n/useT';
import { formatIST, timeIST, relativeAgo } from '@/lib/utils/date';
import { getWard } from '@/lib/data/reference';
import { WeatherSnapshot, DID_YOU_KNOW_FACTS } from '@/lib/mock/dashboardData';
import {
  LuCamera,
  LuMapPin,
  LuBell,
  LuArrowRight,
  LuWind,
  LuHeartPulse,
  LuClock,
  LuFlame,
  LuLeaf,
  LuSparkles,
} from 'react-icons/lu';

function mapWeatherToSnapshot(w: WeatherResponse | null | undefined, aqi?: number | null): WeatherSnapshot {
  if (!w) {
    return {
      temp: '—',
      condition: '—',
      icon: 'sun',
      high: '—',
      low: '—',
      windSpeed: '—',
      windDir: '—',
      humidity: '—',
      rainChance: '—',
      uvIndex: '—',
      sunset: '—',
      feelsLike: '—',
      visibility: '—',
      aqi: aqi ?? undefined,
      aqiLabel: aqi ? 'Moderate' : undefined,
      hourly: [],
    };
  }

  const windDirStr = typeof w.wind?.direction === 'number'
    ? (() => {
        const deg = w.wind.direction;
        if (deg >= 337.5 || deg < 22.5) return 'N';
        if (deg < 67.5) return 'NE';
        if (deg < 112.5) return 'E';
        if (deg < 157.5) return 'SE';
        if (deg < 202.5) return 'S';
        if (deg < 247.5) return 'SW';
        if (deg < 292.5) return 'W';
        return 'NW';
      })()
    : String(w.wind?.direction || (w as any).wind_direction || '—');

  const hourly = (w.hourly_summary_24h || w.hourly_summary || []).slice(0, 6).map((h) => ({
    time: h.hour || '—',
    temp: h.temperature != null ? String(Math.round(h.temperature)) : '—',
    icon: ((h.condition || '').toLowerCase().includes('cloud') ? 'cloud-sun' : 'sun') as 'sun' | 'cloud-sun',
    rainChance: h.rain_chance != null ? `${Math.round(h.rain_chance)}%` : undefined,
  }));

  const conditionLower = (w.condition || '').toLowerCase();
  const icon: 'sun' | 'cloud-sun' | 'wind' | 'haze' | 'moon' = conditionLower.includes('cloud')
    ? 'cloud-sun'
    : conditionLower.includes('rain')
    ? 'wind'
    : conditionLower.includes('fog') || conditionLower.includes('haze')
    ? 'haze'
    : 'sun';

  const tempVal = w.current ?? (w as any).temperature;
  const highVal = w.today_high ?? (w as any).high;
  const lowVal = w.today_low ?? (w as any).low;
  const feelsLikeVal = (w as any).feels_like ?? (w as any).apparent_temperature;
  const visibilityVal = (w as any).visibility ?? (w as any).visibility_km;
  const windSpeedVal = w.wind?.speed ?? (w as any).wind_speed;

  let sunsetStr = w.sunset || '—';
  if (sunsetStr && sunsetStr.includes('T')) {
    try {
      const d = new Date(sunsetStr);
      if (!isNaN(d.getTime())) {
        sunsetStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
      }
    } catch {}
  }

  return {
    temp: tempVal != null ? String(Math.round(tempVal)) : '—',
    condition: w.condition || '—',
    icon,
    high: highVal != null ? String(Math.round(highVal)) : '—',
    low: lowVal != null ? String(Math.round(lowVal)) : '—',
    windSpeed: windSpeedVal != null ? `${windSpeedVal} km/h` : '—',
    windDir: windDirStr,
    humidity: w.humidity != null ? `${w.humidity}%` : '—',
    rainChance: w.rain_chance != null ? `${w.rain_chance}%` : '—',
    uvIndex: w.uv != null ? String(w.uv) : '—',
    sunset: sunsetStr,
    feelsLike: feelsLikeVal != null ? `${Math.round(feelsLikeVal)}°C` : '—',
    visibility: visibilityVal != null ? `${visibilityVal} km` : '—',
    aqi: w.aqi != null ? w.aqi : (aqi != null ? aqi : undefined),
    aqiLabel: 'Moderate',
    hourly,
  };
}

export default function CitizenDashboard() {
  const { t } = useT();
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportsCount, setReportsCount] = useState(0);
  const [routedCount, setRoutedCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [isSampleReports, setIsSampleReports] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [extraToolTraces, setExtraToolTraces] = useState<ToolTraceItem[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [todayError, setTodayError] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [reportsError, setReportsError] = useState(false);
  const [isFallbackProfile, setIsFallbackProfile] = useState(false);

  // Minute interval for live IST time
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setTodayError(false);
    setWeatherError(false);
    setReportsError(false);

    let prof: CitizenProfile | null = null;
    let is404Profile = false;

    try {
      const profileRes = await apiClient.citizen.getProfile();
      prof = profileRes?.data || null;
    } catch (err: any) {
      if (err?.status === 404 || /not found/i.test(err?.message || '')) {
        is404Profile = true;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Profile Fallback] getProfile returned 404; continuing with default ward ward-east-delhi-001 with SAMPLE badge');
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Profile] Failed to fetch citizen profile:', err?.message || err);
        }
      }
    }

    setProfile(prof);
    setIsFallbackProfile(is404Profile);

    const areaId = prof?.area_id || 'ward-east-delhi-001';

    const [todayRes, weatherRes, reportsRes] = await Promise.allSettled([
      apiClient.citizen.today(areaId),
      apiClient.weather(areaId),
      apiClient.reports.community({ limit: 50 }),
    ]);

    if (todayRes.status === 'fulfilled' && todayRes.value?.data) {
      setToday(todayRes.value.data);
      setTodayError(false);
    } else {
      if (isDemoMode()) {
        setToday(getDemoToday(areaId));
        setTodayError(false);
      } else {
        setToday(null);
        setTodayError(true);
      }
    }

    if (weatherRes.status === 'fulfilled' && weatherRes.value?.data) {
      setWeather(weatherRes.value.data);
      setWeatherError(false);
    } else {
      if (isDemoMode()) {
        setWeather(getDemoWeather(areaId));
        setWeatherError(false);
      } else {
        setWeather(null);
        setWeatherError(true);
      }
    }

    if (reportsRes.status === 'fulfilled') {
      const rData = reportsRes.value.data;
      const commList = (rData?.reports || []) as CommunityReport[];
      setCommunityReports(commList);
      setIsSampleReports(Boolean(rData?.is_sample));
      setReportsCount(commList.length);
      setRoutedCount(
        commList.filter((r) => (r.status || '').toLowerCase() === 'routed').length
      );
      setResolvedCount(
        commList.filter((r) => (r.status || '').toLowerCase() === 'resolved').length
      );
      setReportsError(false);
    } else {
      setCommunityReports([]);
      setReportsError(true);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Rotating "Did you know?" facts
  const [factIndex, setFactIndex] = useState(0);
  const [isFactPaused, setIsFactPaused] = useState(false);
  const [isFactFading, setIsFactFading] = useState(false);

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

  const refWard = profile?.area_id ? getWard(profile.area_id) : undefined;
  const wardName = refWard?.name || profile?.area_name || today?.area_name || 'East Delhi';
  const currentDateText = currentTime
    ? `${formatIST(currentTime, { weekday: 'short', month: 'short', day: 'numeric' })}, ${timeIST(currentTime)}`
    : 'Today';
  const weatherSnapshot = mapWeatherToSnapshot(weather, today?.aqi);

  const sourcesTraces: ToolTraceItem[] = (today?.sources || []).map((s) => ({
    tool: s.name,
    status: 'ok',
    latency_ms: 0,
    isSample: s.is_sample,
    timeAgo: s.fetched_at ? relativeAgo(s.fetched_at) : undefined,
  }));

  const allTraces = [...sourcesTraces, ...extraToolTraces];

  const handleToolTracesUpdated = (newTraces: ToolTraceItem[]) => {
    setExtraToolTraces((prev) => [...prev, ...newTraces]);
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
          {(isFallbackProfile || today?.is_sample) && <SampleDataBadge />}
        </div>

        <AlertBanner currentAqi={today?.aqi} areaName={wardName} />
        
        {loading ? (
          <GlassCard className="h-64 flex items-center justify-center">
            <p className="text-[var(--text-mid)] animate-pulse">{t('common.loading')}</p>
          </GlassCard>
        ) : todayError ? (
          <GlassCard className="p-6 text-center space-y-4 border border-[var(--red)]/20">
            <p className="text-sm text-[var(--text-mid)]">Failed to load air quality data</p>
            <PillButton variant="accent" onClick={loadData} className="text-xs">
              Retry
            </PillButton>
          </GlassCard>
        ) : (
          <>
            <GlassCard data-accent="cyan" className="border border-[var(--cyan)]/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-[var(--cyan)]/10 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center text-center py-8">
                <Chip className="bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20 mb-8 px-4 py-1">
                  {wardName}
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
                  <span className="text-6xl font-serif italic text-[var(--text-hi)] leading-none mb-2">
                    {today?.aqi != null ? today.aqi : '—'}
                  </span>
                  <span 
                    className="text-sm font-bold uppercase tracking-widest"
                    style={{ color: getAqiColor(today?.aqi_category) }}
                  >
                    {today?.aqi_category || '—'}
                  </span>
                </div>
                
                <p className="text-xl text-[var(--text-hi)] leading-relaxed max-w-sm mx-auto bg-[var(--bg-1)] p-4 rounded-2xl border border-[var(--border)]">
                  {today?.advice || '—'}
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
                    {today?.wind
                      ? `Winds are currently blowing from the ${today.wind.direction} at ${today.wind.speed_kmh} km/h${today.smoke_drift_note ? `, ${today.smoke_drift_note.toLowerCase()}` : '.'}`
                      : '—'}
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Mobile Agent Log: collapsible accordion */}
            <AgentLogAccordion
              accent="cyan"
              toolTraces={allTraces}
              title="Data sources checked"
            />
          </>
        )}

        {/* Mobile Right Column: Citizen Actions */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-mid)] uppercase tracking-widest mb-6">Actions</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <Link href="/citizen/report" className="col-span-2 block">
              <GlassCard data-accent="red" className="group interactive-card hover:border-[var(--red)]/50 border-[var(--red)]/20">
                <h3 className="font-bold text-[var(--red)] group-hover:text-[var(--accent-2)] flex items-center justify-between text-lg mb-2">
                  {t('citizen.reportBurning')}
                  <LuCamera className="w-5 h-5" />
                </h3>
                <p className="text-sm text-[var(--text-mid)]">{t('citizen.reportBurningDesc')}</p>
              </GlassCard>
            </Link>
            
            <Link href="/map" className="block h-full">
              <IconTile 
                data-accent="violet"
                icon={<LuMapPin className="w-6 h-6" />}
                label={t('citizen.mapView')}
                className="hover:border-[var(--violet)]/50"
              />
            </Link>
            
            <Link href="/profile" className="block h-full">
              <IconTile 
                data-accent="cyan"
                icon={<LuBell className="w-6 h-6" />}
                label={t('citizen.alertSettings')}
                className="hover:border-[var(--cyan)]/50"
              />
            </Link>

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
          <div className="mb-2 shrink-0">
            <AlertBanner currentAqi={today?.aqi} areaName={wardName} />
          </div>
          <div className="grid grid-cols-12 gap-4 xl:gap-5 flex-1 min-h-0">
            {/* ─── Left Column (7/12): Today Hero Card ─── */}
            <div className="col-span-7 h-full min-h-0 flex flex-col">
              <DashboardLeftCard
                accent="cyan"
                weatherPanel={
                  <WeatherPanel
                    weather={weatherSnapshot}
                    title={t('citizen.today')}
                    location={wardName}
                    dateText={currentDateText}
                    isSample={isFallbackProfile || (weather?.is_sample ?? today?.is_sample ?? false)}
                    accent="cyan"
                    isError={weatherError}
                    onRetry={loadData}
                  />
                }
                heroContent={
                  todayError ? (
                    <div className="bg-[var(--bg-1)]/60 rounded-xl p-5 border border-[var(--red)]/20 h-full flex flex-col items-center justify-center text-center gap-3">
                      <p className="text-sm text-[var(--text-mid)]">Failed to load air quality data</p>
                      <PillButton variant="accent" onClick={loadData} className="text-xs">
                        Retry
                      </PillButton>
                    </div>
                  ) : (
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
                        {today?.aqi != null ? today.aqi : '—'}
                      </span>
                      <span
                        className="text-[clamp(0.6rem,1.2vh,0.85rem)] font-bold uppercase tracking-wider"
                        style={{ color: getAqiColor(today?.aqi_category) }}
                      >
                        {today?.aqi_category || '—'}
                      </span>
                    </div>

                    {/* Health Advice limited to 2 lines */}
                    <div className="flex flex-col min-w-0">
                      <div className="text-xs lg:text-[clamp(0.7rem,1.5vh,0.9rem)] font-semibold uppercase tracking-wider text-[var(--cyan)] mb-1 flex items-center gap-1.5">
                        <LuWind className="w-3.5 h-3.5" />
                        <span>Health & Exposure Advice</span>
                      </div>
                      <p className="text-sm lg:text-[clamp(0.85rem,1.8vh,1.1rem)] text-[var(--text-hi)] line-clamp-3 leading-snug lg:leading-relaxed">
                        {today?.advice || '—'}
                      </p>
                      <div className="text-[11px] lg:text-[clamp(0.7rem,1.5vh,0.85rem)] text-[var(--text-low)] mt-2 lg:mt-3 flex items-center gap-2">
                        <span>
                          {today?.wind
                            ? `${today.wind.direction} wind ${today.wind.speed_kmh} km/h`
                            : '—'}
                        </span>
                        <span>•</span>
                        <span className="truncate">
                          {today?.smoke_drift_note || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
                }
                miniStatsGrid={
                  <div className="grid grid-cols-2 auto-rows-fr gap-3.5 h-full">
                    {/* 1. Fires detected in last 24h */}
                    <MiniStatCard
                      label={t('citizen.burningStoppedToday')}
                      accent="emerald"
                      badge={today?.is_sample ? 'SAMPLE' : undefined}
                      icon={<LuFlame className="w-3.5 h-3.5 text-[var(--emerald)]" />}
                      value={today?.fires_24h != null ? `${today.fires_24h} fires` : '—'}
                      caption="Detected in last 24 hours"
                    />

                    {/* 2. Reports submitted count */}
                    <MiniStatCard
                      label={t('citizen.savedToday')}
                      accent="cyan"
                      badge={isSampleReports ? 'SAMPLE' : undefined}
                      icon={<LuLeaf className="w-3.5 h-3.5 text-[var(--cyan)]" />}
                      value={reportsError ? '—' : `${reportsCount} reports`}
                      caption={reportsError ? 'Failed to load' : `${routedCount} routed • ${resolvedCount} resolved`}
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
                      badge="est."
                      icon={<LuClock className="w-3.5 h-3.5 text-cyan-400" />}
                      value={today ? '1:30 PM – 4:00 PM' : '—'}
                      caption={today ? 'Cleanest daylight window (AQI ~140)' : 'No data yet'}
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
                    <Link href="/citizen/report" className="shrink-0 block mb-3 sm:mb-4">
                      <div className="h-[56px] sm:h-[64px] lg:h-[72px] rounded-xl border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--amber)]/50 bg-[var(--bg-2)] flex items-center justify-center gap-3 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors group cursor-pointer">
                        <LuCamera className="w-5 h-5 text-amber-500/70 group-hover:text-amber-400" />
                        <span className="text-xs sm:text-sm font-medium">Tap to snap and upload a photo, location is auto-tagged</span>
                      </div>
                    </Link>

                    {/* Community counts chips */}
                    <div className="shrink-0 flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded bg-[var(--bg-2)] border border-[var(--border)]">
                        Reports: {reportsError ? '—' : reportsCount}
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Routed: {reportsError ? '—' : routedCount}
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Resolved: {reportsError ? '—' : resolvedCount}
                      </span>
                    </div>

                    <div className="flex-1 overflow-hidden min-h-0 flex flex-col justify-end">
                      <div className="w-full mt-2 pt-2 border-t border-[var(--border)] flex flex-col min-h-0 flex-1">
                        <div className="flex items-center justify-between mb-2 shrink-0">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-mid)]">
                            Recent reports
                          </span>
                          <span className="text-[11px] text-[var(--text-low)]">
                            {reportsError ? '—' : `${reportsCount} total`}
                          </span>
                        </div>
                        {reportsError ? (
                          <div className="py-2 text-center text-xs text-[var(--text-mid)] flex items-center justify-center gap-2">
                            <span>Failed to load reports</span>
                            <button
                              type="button"
                              onClick={loadData}
                              className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                            >
                              Retry
                            </button>
                          </div>
                        ) : communityReports.length === 0 ? (
                          <p className="text-xs text-[var(--text-low)] py-1 italic">
                            {t('citizen.noReports')}
                          </p>
                        ) : (
                          <div className="space-y-1.5 overflow-y-auto min-h-0 flex-1 pr-0.5">
                            {communityReports.slice(0, 5).map((r) => {
                              const s = (r.status || '').toLowerCase();
                              const badgeClass =
                                s === 'resolved'
                                  ? 'text-[var(--emerald)] bg-[var(--emerald)]/10 border-[var(--emerald)]/20'
                                  : s === 'routed'
                                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                  : 'text-[var(--cyan)] bg-[var(--cyan)]/10 border-[var(--cyan)]/20';

                              return (
                                <button
                                  key={r.report_id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedReport(r);
                                    setIsReportModalOpen(true);
                                  }}
                                  className="w-full text-left flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--bg-1)]/70 border border-[var(--border)] text-xs hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)]/60 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded bg-[var(--bg-2)] flex items-center justify-center shrink-0 text-amber-400">
                                      <LuCamera className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-[var(--text-hi)] truncate leading-tight capitalize flex items-center gap-1.5">
                                        <span>{r.category.replace(/_/g, ' ')}</span>
                                        {r.is_mine && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--cyan)]/20 text-[var(--cyan)] border border-[var(--cyan)]/40 shrink-0">
                                            You
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-[var(--text-low)] truncate leading-tight mt-0.5">
                                        {r.area_name || 'Delhi NCR'} • {relativeAgo(r.created_at)}
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeClass}`}
                                  >
                                    {r.status}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ActionCard>

                {/* 2. Row of two tiles: Map View & Alert Settings */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0 flex-1 min-h-[5.5rem]">
                  <Link href="/map" className="block h-full">
                    <IconTile
                      data-accent="violet"
                      icon={<LuMapPin className="w-5 h-5 text-[var(--violet)]" />}
                      label={t('citizen.mapView')}
                      sublabel="Delhi NCR & Fires"
                      className="hover:border-[var(--violet)]/50 p-4"
                    />
                  </Link>
                  <Link href="/citizen/alerts" className="block h-full">
                    <IconTile
                      data-accent="cyan"
                      icon={<LuBell className="w-5 h-5 text-[var(--cyan)]" />}
                      label={t('citizen.alertSettings')}
                      sublabel="In-app alerts in the demo; email alerts need confirmation."
                      className="hover:border-[var(--cyan)]/50 p-4"
                    />
                  </Link>
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
            toolTraces={allTraces}
            title="Data sources checked"
          />
        </div>
      </div>

      {/* Community Report Card Modal */}
      <ReportCardModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={selectedReport}
      />
    </div>
  );
}
