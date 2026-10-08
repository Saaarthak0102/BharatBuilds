'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { IconTile } from '@/components/ui/IconTile';
import { HeroCard } from '@/components/dashboard/HeroCard';
import { MiniStatCard } from '@/components/dashboard/MiniStatCard';
import { ActionCard } from '@/components/dashboard/ActionCard';
import { RecentList, RecentListItem } from '@/components/dashboard/RecentList';
import { AgentLogAccordion } from '@/components/dashboard/AgentLogAccordion';
import { apiClient } from '@/lib/api/client';
import { PlanResult } from '@/lib/types';
import { useT } from '@/lib/i18n/useT';
import {
  MOCK_WEATHER_FARMER,
  MOCK_RECENT_BOOKINGS,
  calculateEarnings,
  calculateFarmerImpact,
} from '@/lib/mock/dashboardData';
import {
  LuCalendar,
  LuTractor,
  LuMap,
  LuInfo,
  LuArrowRight,
  LuSparkles,
  LuIndianRupee,
  LuShieldCheck,
  LuLeaf,
} from 'react-icons/lu';

export default function FarmerDashboard() {
  const { t } = useT();
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Computed data from actions-to-earnings and impact engine
  const earningsData = calculateEarnings();
  const impactData = calculateFarmerImpact();

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.farmer.plan({
          village_id: 'village-patiala-001',
          crop_stage: 'harvested',
          language: 'en',
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

  const bookingListItems: RecentListItem[] = MOCK_RECENT_BOOKINGS.map((b) => ({
    id: b.id,
    title: b.machineName,
    subtitle: `${b.dateSlot} • ${b.centre}`,
    status: b.status,
    statusType: b.status.toLowerCase() as any,
    icon: <LuTractor className="w-3.5 h-3.5 text-[var(--emerald)]" />,
  }));

  return (
    <div className="w-full">
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
            <GlassCard data-accent="emerald" className="col-span-2 group interactive-card hover:border-[var(--emerald)]/50">
              <h3 className="font-bold text-[var(--emerald)] group-hover:text-[var(--accent-2)] flex items-center justify-between text-lg mb-2">
                {t('farmer.bookMachine')}
                <LuArrowRight className="w-5 h-5" />
              </h3>
              <p className="text-sm text-[var(--text-mid)]">{t('farmer.bookMachineDesc')}</p>
            </GlassCard>
            
            <IconTile 
              data-accent="emerald"
              icon={<LuMap className="w-6 h-6" />}
              label={t('farmer.strawOutlets')}
              className="hover:border-[var(--emerald)]/50"
            />
            
            <IconTile 
              data-accent="amber"
              icon={<LuCalendar className="w-6 h-6" />}
              label={t('farmer.planner')}
              className="hover:border-[var(--amber)]/50"
            />
            
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
              <HeroCard
                accent="emerald"
                title={t('farmer.myField')}
                location={t('farmer.location')}
                dateText="Tuesday, Nov 5"
                isSample={plan?.is_sample ?? true}
                weather={MOCK_WEATHER_FARMER}
                heroContent={
                  <div className="bg-[var(--bg-1)]/60 rounded-xl p-3 sm:p-3.5 border border-[var(--border)] min-h-0 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[var(--emerald)]/15 text-[var(--emerald)] border border-[var(--emerald)]/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] animate-pulse" />
                        {t('farmer.bestDay')}
                      </span>
                      <span className="text-xs text-[var(--text-low)] font-mono">Score 82/100</span>
                    </div>

                    <div className="text-2xl sm:text-3xl xl:text-4xl font-serif italic text-[var(--text-hi)] leading-tight my-1">
                      {plan?.best_day
                        ? new Date(plan.best_day).toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Tuesday, Nov 5'}
                    </div>

                    <p className="text-xs sm:text-sm text-[var(--text-mid)] line-clamp-2 leading-relaxed">
                      {plan?.reason_text ||
                        "Low wind speeds mean smoke won't drift toward populated areas, and a Happy Seeder is available at Kisan Seva Kendra."}
                    </p>
                  </div>
                }
                miniStatsGrid={
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {/* 1. Machine Availability */}
                    <MiniStatCard
                      label={t('farmer.machineAvailability')}
                      accent="emerald"
                      icon={<LuTractor className="w-3.5 h-3.5 text-[var(--emerald)]" />}
                    >
                      <div className="font-semibold text-xs sm:text-sm text-[var(--text-hi)] truncate leading-tight">
                        Happy Seeder Available
                      </div>
                      <div className="text-[11px] text-[var(--text-mid)] truncate mt-0.5">
                        Kisan Seva Kendra, Patiala
                      </div>
                    </MiniStatCard>

                    {/* 2. My Earnings So Far */}
                    <MiniStatCard
                      label={t('farmer.earningsSoFar')}
                      accent="amber"
                      icon={<LuIndianRupee className="w-3.5 h-3.5 text-amber-400" />}
                      value={earningsData.formattedTotal}
                      caption={`from ${earningsData.actionCount} verified actions`}
                    />

                    {/* 3. Burning Avoided */}
                    <MiniStatCard
                      label={t('farmer.burningAvoided')}
                      accent="emerald"
                      icon={<LuShieldCheck className="w-3.5 h-3.5 text-[var(--emerald)]" />}
                      value={`${impactData.acresAvoided} acres`}
                      caption={`${impactData.tonnesStrawDiverted} t straw diverted`}
                    />

                    {/* 4. Environment Saved */}
                    <MiniStatCard
                      label={t('farmer.environmentSaved')}
                      accent="blue"
                      badge="est."
                      icon={<LuLeaf className="w-3.5 h-3.5 text-cyan-400" />}
                      value={`${impactData.pm25KgSaved} kg PM2.5`}
                      caption={`${impactData.co2TonnesSaved} t CO₂ kept out`}
                    />
                  </div>
                }
                footerContent={
                  <div className="flex items-center gap-2 text-xs text-[var(--emerald)] font-medium">
                    <LuSparkles className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                    <span className="truncate">{impactData.reinforcementText}</span>
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

              <div className="flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-3">
                {/* 1. Extended "Book a machine" card with Recent Bookings */}
                <ActionCard
                  title={t('farmer.bookMachine')}
                  description={t('farmer.bookMachineDesc')}
                  accent="emerald"
                  className="flex-1 min-h-0 flex flex-col justify-between"
                >
                  <RecentList
                    title={t('farmer.recentBookings')}
                    items={bookingListItems}
                    totalCount={MOCK_RECENT_BOOKINGS.length}
                    emptyText={t('farmer.noBookings')}
                  />
                </ActionCard>

                {/* 2. Row of two tiles: Straw Outlets & Planner */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 shrink-0 h-20 sm:h-22">
                  <IconTile
                    data-accent="emerald"
                    icon={<LuMap className="w-5 h-5 text-[var(--emerald)]" />}
                    label={t('farmer.strawOutlets')}
                    sublabel="Patiala Hub"
                    className="hover:border-[var(--emerald)]/50 p-3"
                  />
                  <IconTile
                    data-accent="amber"
                    icon={<LuCalendar className="w-5 h-5 text-amber-400" />}
                    label={t('farmer.planner')}
                    sublabel="Next 7 Days"
                    className="hover:border-[var(--amber)]/50 p-3"
                  />
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
