'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { IconTile } from '@/components/ui/IconTile';
import { DashboardLeftCard } from '@/components/dashboard/DashboardLeftCard';
import { WeatherPanel } from '@/components/dashboard/WeatherPanel';
import { MiniStatCard } from '@/components/dashboard/MiniStatCard';
import { ActionCard } from '@/components/dashboard/ActionCard';
import { RecentList, RecentListItem } from '@/components/dashboard/RecentList';
import { AgentLogAccordion } from '@/components/dashboard/AgentLogAccordion';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { apiClient } from '@/lib/api/client';
import { PlanResult, FarmerProfile, WeatherResponse, FarmerBookingsResponse } from '@/lib/types';
import { useT } from '@/lib/i18n/useT';
import { formatIST, todayIST } from '@/lib/utils/date';
import { getVillage } from '@/lib/data/reference';
import { WeatherSnapshot } from '@/lib/mock/dashboardData';
import {
  LuCalendar,
  LuTractor,
  LuMap,
  LuInfo,
  LuArrowRight,
  LuIndianRupee,
  LuShieldCheck,
  LuLeaf,
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
    : String(w.wind?.direction || '—');

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

  return {
    temp: w.current != null ? String(Math.round(w.current)) : '—',
    condition: w.condition || '—',
    icon,
    high: w.today_high != null ? String(Math.round(w.today_high)) : '—',
    low: w.today_low != null ? String(Math.round(w.today_low)) : '—',
    windSpeed: w.wind?.speed != null ? `${w.wind.speed} km/h` : '—',
    windDir: windDirStr,
    humidity: w.humidity != null ? `${w.humidity}%` : '—',
    rainChance: w.rain_chance != null ? `${w.rain_chance}%` : '—',
    uvIndex: w.uv != null ? String(w.uv) : '—',
    sunset: w.sunset || '—',
    feelsLike: (w as any).feels_like != null ? String((w as any).feels_like) : '—',
    visibility: (w as any).visibility != null ? String((w as any).visibility) : '—',
    aqi: w.aqi != null ? w.aqi : (aqi != null ? aqi : undefined),
    aqiLabel: 'Moderate',
    hourly,
  };
}

export default function FarmerDashboard() {
  const { t } = useT();
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [bookingsData, setBookingsData] = useState<FarmerBookingsResponse | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isSampleBookings, setIsSampleBookings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDateText, setCurrentDateText] = useState('');

  useEffect(() => {
    setCurrentDateText(
      formatIST(todayIST(), {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const profileRes = await apiClient.farmer.getProfile().catch(() => ({ data: null }));
        const prof = profileRes?.data || null;
        if (mounted) setProfile(prof);

        const villageId = prof?.village_id || 'village-patiala-001';
        const cropStage = prof?.crop_stage || 'harvested';
        const lang = prof?.language || 'en';

        const [planRes, weatherRes, bookingsRes] = await Promise.allSettled([
          apiClient.farmer.plan({
            village_id: villageId,
            crop_stage: cropStage,
            language: lang,
          }),
          apiClient.weather(villageId),
          apiClient.farmer.getBookings(),
        ]);

        if (mounted) {
          if (planRes.status === 'fulfilled') {
            setPlan(planRes.value.data);
          }
          if (weatherRes.status === 'fulfilled') {
            setWeather(weatherRes.value.data);
          }
          if (bookingsRes.status === 'fulfilled') {
            const bData = bookingsRes.value.data;
            setBookingsData(bData);
            const fetchedBookings = bData?.bookings || [];
            if (fetchedBookings.length > 0) {
              setBookings(fetchedBookings);
              setIsSampleBookings(Boolean(bData?.is_sample));
            } else {
              setBookings([]);
              setIsSampleBookings(false);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load farmer dashboard data', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const refVillage = profile?.village_id ? getVillage(profile.village_id) : undefined;
  const villageName = profile?.village_name || refVillage?.name || 'Village';
  const districtName = profile?.district || refVillage?.district || 'Punjab';
  const locationText = `${villageName}, ${districtName}`;

  const weatherSnapshot = mapWeatherToSnapshot(weather, (plan as any)?.aqi ?? undefined);

  const bookingsCount = bookingsData?.status_counts?.TOTAL ?? bookings.length;
  const completedCount = bookingsData?.status_counts?.COMPLETED ?? bookings.filter(
    (b) => (b.status || '').toLowerCase() === 'completed'
  ).length;
  const upcomingCount =
    ((bookingsData?.status_counts?.CONFIRMED || 0) + (bookingsData?.status_counts?.PENDING || 0)) ||
    bookings.filter((b) => {
      const s = (b.status || '').toLowerCase();
      return s === 'pending' || s === 'confirmed' || s === 'upcoming';
    }).length;

  const impact = bookingsData?.impact;

  const villageId = profile?.village_id || 'village-patiala-001';
  const bookQuery = plan?.machine_option
    ? `?village=${encodeURIComponent(villageId)}&date=${encodeURIComponent(plan.machine_option.date)}&machine=${encodeURIComponent(plan.machine_option.machine_type)}&slot_id=${encodeURIComponent(plan.machine_option.slot_id)}`
    : '';

  const bookingListItems: RecentListItem[] = bookings.map((b, idx) => ({
    id: b.booking_id || b.id || `bk-${idx}`,
    title: b.machine_type || b.machineName || 'Machine',
    subtitle: `${
      b.date
        ? formatIST(b.date, { month: 'short', day: 'numeric' })
        : b.dateSlot || 'Slot booked'
    } • ${
      b.owner_label ||
      b.centre ||
      `${villageName} Centre`
    }`,
    status: b.status || 'CONFIRMED',
    statusType: (b.status || 'confirmed').toLowerCase() as any,
    icon: <LuTractor className="w-3.5 h-3.5 text-[var(--emerald)]" />,
  }));

  return (
    <div className="w-full">
      <AmbientBackground accent="emerald" />
      {/* ==================================================================== */}
      {/* MOBILE LAYOUT (strictly below lg breakpoint)                         */}
      {/* Structure, spacing and ordering preserved from previous mobile layout */}
      {/* Only allowed mobile change: AgentLog becomes collapsible accordion    */}
      {/* ==================================================================== */}
      <div className="lg:hidden p-4 md:p-6 space-y-6">
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
            <GlassCard data-accent="emerald" className="border border-[var(--emerald)]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--emerald)]/10 blur-[80px] rounded-full" />
              
              <div className="relative z-10">
                <Chip variant="accent" className="bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20 mb-4">
                  {t('farmer.bestDay')}
                </Chip>
                
                <div className="text-4xl md:text-5xl font-serif italic text-[var(--text-hi)] mb-6">
                  {plan?.best_day ? formatIST(plan.best_day, { weekday: 'long', month: 'short', day: 'numeric' }) : currentDateText}
                </div>
                
                {plan?.sowing_window_status && plan.sowing_window_status !== 'inside' && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <LuInfo className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Outside Recommended Sowing Window ({plan.sowing_window_status}).</strong> Window: {plan.window_start} to {plan.window_end}.
                    </div>
                  </div>
                )}

                {plan?.no_ideal_day && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                    <LuInfo className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>No Ideal Day Found.</strong> Best available day displayed (score: {plan.score}/100).
                    </div>
                  </div>
                )}

                <p className="text-lg md:text-xl text-[var(--text-hi)] leading-relaxed bg-[var(--bg-1)] p-5 rounded-2xl border border-[var(--border)] mb-8">
                  {plan?.reason_text || '—'}
                </p>
                
                {plan?.machine_option ? (
                  <div className="flex items-center gap-4 bg-[var(--bg-0)] p-4 rounded-xl border border-[var(--border)]">
                    <div className="w-12 h-12 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] text-xl shrink-0">
                      <LuTractor />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-hi)]">
                        {plan.machine_option.machine_type} Available{plan.machine_option.is_sample ? ' (SAMPLE)' : ''}
                      </h3>
                      <p className="text-sm text-[var(--text-mid)]">{plan.machine_option.owner_label}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 bg-[var(--bg-0)] p-4 rounded-xl border border-[var(--border)]">
                    <div className="w-12 h-12 rounded-full bg-[var(--amber)]/20 flex items-center justify-center text-[var(--amber)] text-xl shrink-0">
                      <LuMap />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-hi)]">
                        No machine free this week
                      </h3>
                      <p className="text-sm text-[var(--text-mid)]">
                        {plan?.straw_outlet_option
                          ? `Visit Straw Outlet: ${plan.straw_outlet_option.name}`
                          : 'Check straw outlets for alternate disposal'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Mobile Agent Log: collapsible accordion */}
            <AgentLogAccordion
              accent="emerald"
              toolTraces={plan?.tool_trace || []}
              title={t('farmer.agentTrace')}
            />
          </>
        )}

        {/* Mobile Right Column / Actions */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-mid)] uppercase tracking-widest mb-6">Actions</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <Link href={`/farmer/book${bookQuery}`} className="col-span-2 block">
              <GlassCard data-accent="emerald" className="group interactive-card hover:border-[var(--emerald)]/50 h-full">
                <h3 className="font-bold text-[var(--emerald)] group-hover:text-[var(--accent-2)] flex items-center justify-between text-lg mb-2">
                  {t('farmer.bookMachine')}
                  <LuArrowRight className="w-5 h-5" />
                </h3>
                <p className="text-sm text-[var(--text-mid)]">{t('farmer.bookMachineDesc')}</p>
              </GlassCard>
            </Link>
            
            <Link href="/farmer/straw-outlets" className="block h-full">
              <IconTile 
                data-accent="emerald"
                icon={<LuMap className="w-6 h-6" />}
                label={t('farmer.strawOutlets')}
                className="hover:border-[var(--emerald)]/50"
              />
            </Link>
            
            <Link href="/farmer/field" className="block h-full">
              <IconTile 
                data-accent="amber"
                icon={<LuCalendar className="w-6 h-6" />}
                label={t('farmer.planner')}
                className="hover:border-[var(--amber)]/50"
              />
            </Link>
            
            <GlassCard data-accent="cyan" className="col-span-2 group interactive-card hover:border-[var(--cyan)]/50">
              <div className="flex items-center gap-3">
                <LuInfo className="w-5 h-5 text-[var(--text-mid)] group-hover:text-[var(--emerald)] transition-colors" />
                <div>
                  <h3 className="font-bold text-[var(--text-hi)] text-sm">{t('farmer.subsidyInfo')}</h3>
                  <p className="text-xs text-[var(--text-mid)] mt-1">{t('farmer.subsidyDesc')}</p>
                </div>
              </div>
            </GlassCard>
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
            {/* ─── Left Column (7/12): My Field Hero Card ─── */}
            <div className="col-span-7 h-full min-h-0 flex flex-col">
              <DashboardLeftCard
                accent="emerald"
                weatherPanel={
                  <WeatherPanel
                    weather={weatherSnapshot}
                    title={t('farmer.myField')}
                    location={locationText}
                    dateText={currentDateText}
                    isSample={weather?.is_sample ?? plan?.is_sample ?? false}
                    accent="emerald"
                  />
                }
                heroContent={
                  <div className="bg-[var(--bg-1)]/60 rounded-xl p-4 sm:p-5 border border-[var(--border)] h-full min-h-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-2 mb-2 lg:mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] lg:text-xs font-bold uppercase tracking-wider bg-[var(--emerald)]/15 text-[var(--emerald)] border border-[var(--emerald)]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-pulse" />
                        {t('farmer.bestDay')}
                      </span>
                      <span className="text-xs lg:text-sm text-[var(--text-low)] font-mono">
                        Score {plan?.score != null ? plan.score : '—'}/100{plan?.is_sample ? ' (SAMPLE)' : ''}
                      </span>
                    </div>

                    {plan?.sowing_window_status && plan.sowing_window_status !== 'inside' && (
                      <div className="mb-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                        <LuInfo className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Outside Sowing Window ({plan.sowing_window_status}).</strong> Window: {plan.window_start} to {plan.window_end}.
                        </div>
                      </div>
                    )}

                    {plan?.no_ideal_day && (
                      <div className="mb-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                        <LuInfo className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>No Ideal Day Found.</strong> Best available day displayed (score: {plan.score}/100).
                        </div>
                      </div>
                    )}

                    <div className="text-[clamp(2rem,4vh,3.5rem)] font-serif italic text-[var(--text-hi)] leading-tight my-2 lg:my-3">
                      {plan?.best_day
                        ? formatIST(plan.best_day, {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })
                        : currentDateText}
                    </div>

                    <p className="text-sm lg:text-[clamp(0.9rem,2vh,1.25rem)] text-[var(--text-mid)] line-clamp-3 leading-relaxed mt-1 lg:mt-2">
                      {plan?.reason_text || '—'}
                    </p>
                  </div>
                }
                miniStatsGrid={
                  <div className="grid grid-cols-2 auto-rows-fr gap-3.5 h-full">
                    {/* 1. Machine Availability */}
                    <MiniStatCard
                      label={t('farmer.machineAvailability')}
                      accent="emerald"
                      badge={plan?.machine_option?.is_sample ? 'SAMPLE' : undefined}
                      icon={<LuTractor className="w-3.5 h-3.5 text-[var(--emerald)]" />}
                      value={plan?.machine_option?.machine_type || 'No machine free this week'}
                      caption={
                        plan?.machine_option
                          ? `${plan.machine_option.owner_label}${plan.machine_option.date ? ` • ${formatIST(plan.machine_option.date, { month: 'short', day: 'numeric' })}` : ''}`
                          : plan?.straw_outlet_option
                          ? `Straw outlet: ${plan.straw_outlet_option.name}`
                          : 'Check straw outlets for alternate disposal'
                      }
                    />

                    {/* 2. My Earnings So Far */}
                    <MiniStatCard
                      label={t('farmer.earningsSoFar')}
                      accent="amber"
                      badge="est."
                      icon={<LuIndianRupee className="w-3.5 h-3.5 text-amber-400" />}
                      value={impact?.financial_savings_inr_est != null ? `₹${impact.financial_savings_inr_est.toLocaleString('en-IN')}` : '—'}
                      caption={impact?.verified_actions_count != null ? `from ${impact.verified_actions_count} verified actions` : 'from verified actions'}
                    />

                    {/* 3. Burning Avoided */}
                    <MiniStatCard
                      label={t('farmer.burningAvoided')}
                      accent="emerald"
                      badge="est."
                      icon={<LuShieldCheck className="w-3.5 h-3.5 text-[var(--emerald)]" />}
                      value={impact?.acres_avoided_est != null ? `${impact.acres_avoided_est} acres` : '—'}
                      caption={impact?.straw_diverted_tonnes_est != null ? `${impact.straw_diverted_tonnes_est} t straw diverted` : 'straw diverted'}
                    />

                    {/* 4. Environment Saved */}
                    <MiniStatCard
                      label={t('farmer.environmentSaved')}
                      accent="blue"
                      badge="est."
                      icon={<LuLeaf className="w-3.5 h-3.5 text-cyan-400" />}
                      value={impact?.pm25_kg_saved_est != null ? `${impact.pm25_kg_saved_est} kg PM2.5` : '—'}
                      caption={impact?.co2_tonnes_saved_est != null ? `${impact.co2_tonnes_saved_est} t CO₂ kept out` : 'CO₂ kept out'}
                    />
                  </div>
                }
              />
            </div>

            {/* ─── Right Column (5/12): Actions ─── */}
            <div className="col-span-5 h-full min-h-0 flex flex-col justify-between">
              <div className="flex items-center justify-between shrink-0 mb-2">
                <h2 className="text-xs font-bold text-[var(--text-mid)] uppercase tracking-widest">
                  {t('common.actions')}
                </h2>
                <span className="text-[11px] text-[var(--text-low)]">Quick Access</span>
              </div>

              <div className="flex-1 min-h-0 flex flex-col gap-4">
                {/* 1. Extended "Book a machine" card with Recent Bookings */}
                <ActionCard
                  title={t('farmer.bookMachine')}
                  description={t('farmer.bookMachineDesc')}
                  accent="emerald"
                  className="flex-[3] min-h-0 flex flex-col justify-between"
                >
                  <div className="flex flex-col flex-1 justify-between min-h-0 mt-3 sm:mt-4">
                    {/* NEW Next available row */}
                    <div className="shrink-0 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-2)] p-3 sm:p-4 flex items-center justify-between gap-3 mb-3 sm:mb-4 group hover:border-[var(--emerald)]/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] shrink-0 group-hover:scale-105 transition-transform">
                          <LuTractor className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-[var(--text-hi)] truncate">
                            {plan?.machine_option?.machine_type || 'No machine free this week'}
                          </h4>
                          <p className="text-[11px] sm:text-xs text-[var(--text-mid)] truncate mt-0.5">
                            {plan?.machine_option
                              ? `${plan.machine_option.owner_label} • ${
                                  formatIST(plan.machine_option.date || plan.best_day, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                }${plan.machine_option.is_sample ? ' (SAMPLE)' : ''}`
                              : plan?.straw_outlet_option
                              ? `Consider Straw Outlet: ${plan.straw_outlet_option.name}`
                              : 'Check straw outlets for alternate disposal'}
                          </p>
                        </div>
                      </div>
                      <Link href={`/farmer/book${bookQuery}`} className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[var(--emerald)] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#10b981] transition-colors shadow-lg shadow-emerald-500/20 text-center flex items-center justify-center">
                        Book
                      </Link>
                    </div>

                    {/* NEW stats row chips */}
                    <div className="shrink-0 flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded bg-[var(--bg-2)] border border-[var(--border)]">
                        Bookings: {bookingsCount}{isSampleBookings ? ' (SAMPLE)' : ''}
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Completed: {completedCount}{isSampleBookings ? ' (SAMPLE)' : ''}
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Upcoming: {upcomingCount}{isSampleBookings ? ' (SAMPLE)' : ''}
                      </span>
                    </div>

                    <div className="flex-1 overflow-hidden min-h-0 flex flex-col justify-end">
                      <RecentList
                        title={t('farmer.recentBookings')}
                        items={bookingListItems}
                        totalCount={bookingsCount}
                        emptyText={t('farmer.noBookings')}
                      />
                    </div>
                  </div>
                </ActionCard>

                {/* 2. Row of two tiles: Straw Outlets & Planner */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0 flex-1 min-h-[5.5rem]">
                  <Link href="/farmer/straw-outlets" className="block h-full">
                    <IconTile
                      data-accent="emerald"
                      icon={<LuMap className="w-5 h-5 text-[var(--emerald)]" />}
                      label={t('farmer.strawOutlets')}
                      sublabel={`${districtName} Hub`}
                      className="hover:border-[var(--emerald)]/50 p-4"
                    />
                  </Link>
                  <Link href="/farmer/field" className="block h-full">
                    <IconTile
                      data-accent="amber"
                      icon={<LuCalendar className="w-5 h-5 text-amber-400" />}
                      label={t('farmer.planner')}
                      sublabel="Next 7 Days"
                      className="hover:border-[var(--amber)]/50 p-4"
                    />
                  </Link>
                </div>

                {/* 3. Subsidy Info Card */}
                <GlassCard
                  data-accent="cyan"
                  className="shrink-0 p-3 sm:p-3.5 interactive-card hover:border-[var(--cyan)]/50 flex items-center justify-between gap-3 border border-[var(--cyan)]/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--cyan)]/15 flex items-center justify-center text-[var(--cyan)] shrink-0">
                      <LuInfo className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[var(--text-hi)] text-xs sm:text-sm truncate">
                        {t('farmer.subsidyInfo')}
                      </h3>
                      <p className="text-[11px] text-[var(--text-mid)] truncate mt-0.5">
                        {t('farmer.subsidyDesc')}
                      </p>
                    </div>
                  </div>
                  <LuArrowRight className="w-4 h-4 text-[var(--cyan)] shrink-0" />
                </GlassCard>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Below Dashboard: Full-width Agent Log Accordion (reached by scroll) ─── */}
        <div className="w-full pt-4 pb-12">
          <AgentLogAccordion
            accent="emerald"
            toolTraces={plan?.tool_trace || []}
            title={t('farmer.agentTrace')}
          />
        </div>
      </div>
    </div>
  );
}
