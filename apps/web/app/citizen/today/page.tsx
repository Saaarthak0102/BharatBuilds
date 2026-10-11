'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { WeatherStrip } from '@/components/dashboard/WeatherStrip';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { CitizenBackHeader } from '@/components/citizen/CitizenBackHeader';
import { AlertBanner } from '@/components/citizen/AlertBanner';
import { AgentLogAccordion } from '@/components/dashboard/AgentLogAccordion';
import { getToday, getProfile, getWeather } from '@/lib/api/client';
import { wards, getWard } from '@/lib/data/reference';
import { TodayResponse, WeatherResponse, AQICategory } from '@/lib/types';
import { WeatherStripData } from '@/lib/mock/dashboardData';
import { useT } from '@/lib/i18n/useT';
import { relativeAgo } from '@/lib/utils/date';
import { LuMapPin, LuRefreshCw, LuWind, LuShieldAlert, LuWifiOff } from 'react-icons/lu';

const LOCAL_STORAGE_CACHE_KEY = 'saans_citizen_today_cache';

function getCategoryColor(cat?: string): string {
  switch (cat) {
    case 'Good':
      return 'var(--green)';
    case 'Satisfactory':
      return '#84CC16';
    case 'Moderate':
      return 'var(--amber)';
    case 'Poor':
      return '#F97316';
    case 'Very Poor':
      return 'var(--red)';
    case 'Severe':
      return '#991B1B';
    default:
      return 'var(--cyan)';
  }
}

function getCategoryFromAqi(aqi: number): AQICategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return 'recently';
  try {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'recently';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'recently';
  }
}

export default function CitizenTodayPage() {
  const { t } = useT();
  const [selectedAreaId, setSelectedAreaId] = useState<string>('ward-east-delhi-001');
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [cachedTime, setCachedTime] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // 1. Initial Load: load cache first, then resolve default area from profile, then fetch
  useEffect(() => {
    let active = true;

    // Try reading cache immediately to avoid blank screen (guard: must be within last 24h)
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const ts = parsed?.timestamp ? new Date(parsed.timestamp).getTime() : 0;
        const now = Date.now();
        if (parsed?.data && ts && now - ts < 24 * 60 * 60 * 1000) {
          setToday(parsed.data);
          setIsCached(true);
          setCachedTime(parsed.timestamp || null);
          if (parsed.data.area_id) {
            setSelectedAreaId(parsed.data.area_id);
          }
        } else {
          localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY);
        }
      }
    } catch {
      // Ignore cache parse error
    }

    async function initialize() {
      let initialAreaId = 'ward-east-delhi-001';
      try {
        const profileRes = await getProfile();
        if (profileRes?.data && 'area_id' in profileRes.data && profileRes.data.area_id) {
          initialAreaId = profileRes.data.area_id;
        }
      } catch {
        // Fall back to default ward
      }

      if (!active) return;
      setSelectedAreaId(initialAreaId);
      await fetchTodayData(initialAreaId);
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  async function fetchTodayData(areaId: string) {
    setLoading(true);
    setError(null);

    try {
      const [todayRes, weatherRes] = await Promise.allSettled([
        getToday(areaId),
        getWeather(areaId),
      ]);

      if (todayRes.status === 'fulfilled' && todayRes.value?.data) {
        setToday(todayRes.value.data);
        setIsCached(false);
        setCachedTime(null);
        try {
          localStorage.setItem(
            LOCAL_STORAGE_CACHE_KEY,
            JSON.stringify({
              data: todayRes.value.data,
              timestamp: new Date().toISOString(),
            })
          );
        } catch {
          // Ignore localStorage quota errors
        }
      } else {
        throw new Error('No air quality data received from service');
      }

      if (weatherRes.status === 'fulfilled' && weatherRes.value?.data) {
        setWeather(weatherRes.value.data);
      } else {
        setWeather(null);
      }
    } catch (err: any) {
      // Check if we already have or can fall back to valid cached data
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const ts = parsed?.timestamp ? new Date(parsed.timestamp).getTime() : 0;
          const now = Date.now();
          if (parsed?.data && ts && now - ts < 24 * 60 * 60 * 1000) {
            setToday(parsed.data);
            setIsCached(true);
            setCachedTime(parsed.timestamp || null);
            setError(null);
            return;
          } else {
            localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY);
          }
        }
      } catch {
        // Ignore cache lookup failure
      }
      setError(err?.message || 'Unable to load air quality data. Please check connection.');
    } finally {
      setLoading(false);
    }
  }

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAreaId = e.target.value;
    startTransition(() => {
      setSelectedAreaId(newAreaId);
    });
    fetchTodayData(newAreaId);
  };

  const selectedWard = getWard(selectedAreaId);
  const aqiColor = getCategoryColor(today?.aqi_category);

  // Freshness calculation
  const freshnessTimeStr =
    typeof today?.freshness === 'object' && today.freshness !== null
      ? today.freshness.data_updated_at
      : typeof today?.freshness === 'string'
      ? today.freshness
      : undefined;
  const freshnessLabel = `Updated ${relativeAgo(freshnessTimeStr)}`;

  // Construct WeatherStrip data matching WeatherStripData shape from real weather
  const weatherStripData: WeatherStripData | null = today
    ? {
        temperature:
          weather?.current != null
            ? `${Math.round(weather.current)}°C`
            : (weather as any)?.temperature != null
            ? `${Math.round((weather as any).temperature)}°C`
            : '—',
        condition: weather?.condition || '—',
        conditionIcon: (weather?.condition || '').toLowerCase().includes('clear')
          ? 'sun'
          : (weather?.condition || '').toLowerCase().includes('cloud')
          ? 'cloud-sun'
          : (weather?.condition || '').toLowerCase().includes('rain')
          ? 'wind'
          : 'haze',
        windSpeed:
          weather?.wind?.speed != null
            ? `${weather.wind.speed} km/h`
            : (weather as any)?.wind_speed != null
            ? `${(weather as any).wind_speed} km/h`
            : today.wind?.speed_kmh
            ? `${today.wind.speed_kmh} km/h`
            : '—',
        windDirection:
          typeof weather?.wind?.direction === 'number'
            ? (() => {
                const deg = weather.wind.direction;
                if (deg >= 337.5 || deg < 22.5) return 'N';
                if (deg < 67.5) return 'NE';
                if (deg < 112.5) return 'E';
                if (deg < 157.5) return 'SE';
                if (deg < 202.5) return 'S';
                if (deg < 247.5) return 'SW';
                if (deg < 292.5) return 'W';
                return 'NW';
              })()
            : String(
                weather?.wind?.direction ||
                  (weather as any)?.wind_direction ||
                  today.wind?.direction ||
                  '—'
              ),
        humidity:
          weather?.humidity != null ? `${weather.humidity}%` : '—',
        rainChance:
          weather?.rain_chance != null ? `${weather.rain_chance}%` : '—',
        aqiValue: today.aqi,
        aqiCategory: today.aqi_category,
      }
    : null;

  return (
    <div className="w-full pb-16">
      <AmbientBackground accent="cyan" aqiCategory={today?.aqi_category} />
      
      <CitizenBackHeader
        title={t('citizen.today') || "Today's Air"}
        badge={today?.is_sample ? <SampleDataBadge /> : undefined}
      />

      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        <AlertBanner
          currentAqi={today?.aqi}
          areaName={selectedWard ? `${selectedWard.name}, ${selectedWard.zone}` : today?.area_name}
        />

        {/* Top Control Bar: Ward Picker & Freshness / Offline Cache status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="area-select" className="sr-only">
              {t('citizen.selectArea') || 'Select Ward / Area'}
            </label>
            <div className="relative inline-flex items-center">
              <LuMapPin className="absolute left-3 w-4 h-4 text-[var(--cyan)] pointer-events-none" />
              <select
                id="area-select"
                value={selectedAreaId}
                onChange={handleAreaChange}
                disabled={loading}
                className="pl-9 pr-8 py-2 bg-[var(--bg-1)] border border-[var(--border)] rounded-full text-sm font-medium text-[var(--text-hi)] hover:border-[var(--cyan)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {wards.map((ward) => (
                  <option key={ward.ward_id} value={ward.ward_id} className="bg-[var(--bg-0)] text-[var(--text-hi)]">
                    {ward.name} ({ward.zone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-mid)]">
            {isCached && (
              <Chip className="bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1.5 py-0.5">
                <LuWifiOff className="w-3 h-3" />
                <span>Last result ({relativeAgo(cachedTime || undefined)})</span>
              </Chip>
            )}
            {!isCached && today && (
              <span className="text-[11px] text-[var(--text-low)] tracking-wide uppercase font-medium">
                {freshnessLabel}
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchTodayData(selectedAreaId)}
              disabled={loading}
              aria-label="Refresh today data"
              className="p-1.5 rounded-full hover:bg-[var(--bg-2)] text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
            >
              <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading State: Skeleton GlassCard */}
        {loading && !today && (
          <GlassCard className="p-8 space-y-6 animate-pulse border border-[var(--cyan)]/20">
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="w-24 h-6 rounded-full bg-[var(--bg-2)]" />
              <div className="w-40 h-40 rounded-full border-4 border-[var(--bg-2)] bg-[var(--bg-1)] flex items-center justify-center">
                <div className="w-20 h-12 bg-[var(--bg-2)] rounded-lg" />
              </div>
              <div className="w-32 h-6 rounded-full bg-[var(--bg-2)]" />
              <div className="w-full max-w-md h-16 rounded-xl bg-[var(--bg-2)] mt-4" />
            </div>
          </GlassCard>
        )}

        {/* Error State with Retry */}
        {error && !today && (
          <GlassCard className="p-8 text-center space-y-4 border border-[var(--red)]/30">
            <div className="w-12 h-12 mx-auto rounded-full bg-[var(--red)]/10 text-[var(--red)] flex items-center justify-center">
              <LuShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-hi)]">{t('common.error') || 'Error'}</h2>
              <p className="text-sm text-[var(--text-mid)] mt-1">{error}</p>
            </div>
            <PillButton
              variant="accent"
              onClick={() => fetchTodayData(selectedAreaId)}
              className="inline-flex items-center gap-2"
            >
              <LuRefreshCw className="w-4 h-4" />
              <span>{t('common.retry') || 'Retry'}</span>
            </PillButton>
          </GlassCard>
        )}

        {/* Main Content: AQI Hero, Category, API Advice, Forecast Strip */}
        {today && (
          <>
            <GlassCard
              data-accent="cyan"
              className="border border-[var(--cyan)]/20 relative overflow-hidden text-center py-8 px-4 sm:px-8"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[var(--cyan)]/10 blur-[100px] rounded-full pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                {/* Area Location Badge */}
                <Chip className="bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20 mb-6 px-4 py-1 text-xs">
                  {selectedWard ? `${selectedWard.name}, ${selectedWard.zone}` : today.area_name}
                </Chip>

                {/* Prominent AQI Dial Ring */}
                <div
                  className="w-48 h-48 sm:w-52 sm:h-52 rounded-full border-[7px] flex flex-col items-center justify-center mb-6 relative transition-all"
                  style={{ borderColor: `${aqiColor}35` }}
                >
                  <div
                    className="absolute inset-0 rounded-full border-[7px] border-t-transparent border-r-transparent transform -rotate-45"
                    style={{ borderColor: aqiColor }}
                  />
                  <span className="text-6xl sm:text-7xl font-serif italic text-[var(--text-hi)] leading-none mb-2">
                    {today.aqi}
                  </span>

                  {/* Category Badge with TEXT (not colour alone) */}
                  <span
                    className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
                    style={{
                      color: aqiColor,
                      borderColor: `${aqiColor}60`,
                      backgroundColor: `${aqiColor}15`,
                    }}
                  >
                    Category: {today.aqi_category}
                  </span>
                </div>

                {/* Plain Advice Line from API (never mock/health profile copy) */}
                <div className="w-full max-w-lg mx-auto bg-[var(--bg-1)]/80 p-4 sm:p-5 rounded-2xl border border-[var(--border)] text-left space-y-1.5 shadow-lg">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--cyan)] flex items-center gap-1.5">
                    <LuWind className="w-3.5 h-3.5" />
                    <span>{t('citizen.healthExposureAdvice') || 'Official Air Quality Guidance'}</span>
                  </div>
                  <p className="text-sm sm:text-base text-[var(--text-hi)] leading-relaxed">
                    {today.advice}
                  </p>
                </div>

                {today.smoke_drift_note && (
                  <p className="text-xs text-[var(--text-low)] mt-4 max-w-md mx-auto italic">
                    {today.smoke_drift_note}
                  </p>
                )}
              </div>
            </GlassCard>

            {/* 24h Forecast Strip: WeatherStrip pattern */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-[var(--text-mid)] uppercase tracking-wider">
                  {t('citizen.trend24h') || '24-Hour Forecast & Conditions'}
                </h2>
                {today.is_sample && <SampleDataBadge />}
              </div>

              {weatherStripData && <WeatherStrip data={weatherStripData} />}

              {/* 24-Hour Hourly AQI Trend Strip */}
              {today.trend_24h && today.trend_24h.length > 0 && (
                <GlassCard className="p-4 overflow-hidden">
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 overflow-x-auto pb-1 pt-1">
                    {today.trend_24h.map((pt, idx) => {
                      const ptCat = getCategoryFromAqi(pt.aqi);
                      const ptColor = getCategoryColor(ptCat);
                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center justify-between p-2.5 rounded-xl bg-[var(--bg-1)]/70 border border-[var(--border)] text-center min-w-[70px]"
                        >
                          <span className="text-[10px] text-[var(--text-low)] font-mono">{pt.hour}</span>
                          <span className="text-lg font-serif italic text-[var(--text-hi)] my-1">{pt.aqi}</span>
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none"
                            style={{
                              color: ptColor,
                              borderColor: `${ptColor}40`,
                              backgroundColor: `${ptColor}15`,
                            }}
                          >
                            {ptCat}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              )}

              {/* Data sources checked: live / demo sources */}
              {today.sources && today.sources.length > 0 && (
                <div className="pt-2">
                  <AgentLogAccordion
                    accent="cyan"
                    title="Data sources checked"
                    toolTraces={today.sources.map((s) => ({
                      tool: s.name,
                      status: 'ok',
                      latency_ms: 0,
                      isSample: s.is_sample,
                      timeAgo: s.fetched_at ? relativeAgo(s.fetched_at) : undefined,
                    }))}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
