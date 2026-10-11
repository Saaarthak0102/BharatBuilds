'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { AgentLogAccordion } from '@/components/dashboard/AgentLogAccordion';
import { useT } from '@/lib/i18n/useT';
import { apiClient } from '@/lib/api/client';
import { villages } from '@/lib/data/reference';
import { PlanResult, FarmerProfile } from '@/lib/types';
import { formatIST, isWithinWeekIST } from '@/lib/utils/date';
import { LuArrowLeft, LuTractor, LuMap, LuInfo, LuSparkles, LuCheck, LuCalendar } from 'react-icons/lu';

function BookMachineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useT();

  const urlSlotId = searchParams.get('slot_id');
  const urlDate = searchParams.get('date');

  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [cropStage, setCropStage] = useState<'harvested' | 'partially_cleared' | 'standing'>('harvested');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  // Direct Booking State
  const [isBooking, setIsBooking] = useState(false);
  const [bookedSuccess, setBookedSuccess] = useState<{ booking_id: string; date: string; machine_type: string } | null>(null);
  const [conflictError, setConflictError] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const agentSteps = [
    'Checking weather forecast...',
    'Analyzing wind patterns...',
    'Checking local fire activity...',
    'Finding available machines...',
    'Finalizing best day...',
  ];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visibleTraceCount, setVisibleTraceCount] = useState<number>(0);

  useEffect(() => {
    apiClient.farmer
      .getProfile()
      .then((res) => {
        setProfile(res.data);
        setSelectedVillageId(res.data.village_id);
        setCropStage(res.data.crop_stage);
      })
      .catch((err) => {
        console.error('Failed to load profile', err);
      })
      .finally(() => {
        setLoadingProfile(false);
      });
  }, []);

  useEffect(() => {
    if (isPlanning) {
      const interval = setInterval(() => {
        setCurrentStepIndex((prev) => Math.min(prev + 1, agentSteps.length - 1));
      }, 800);
      return () => clearInterval(interval);
    } else {
      setCurrentStepIndex(0);
    }
  }, [isPlanning]);

  // Reveal demo trace steps one-by-one over ~3 seconds; show real trace immediately
  useEffect(() => {
    if (!planResult?.tool_trace || planResult.tool_trace.length === 0) {
      setVisibleTraceCount(0);
      return;
    }

    if (!planResult.is_sample) {
      setVisibleTraceCount(planResult.tool_trace.length);
      return;
    }

    setVisibleTraceCount(1);
    const total = planResult.tool_trace.length;
    const stepDelay = Math.max(300, Math.floor(3000 / Math.max(1, total)));
    const interval = setInterval(() => {
      setVisibleTraceCount((prev) => {
        if (prev >= total) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, stepDelay);

    return () => clearInterval(interval);
  }, [planResult]);

  const runPlan = async () => {
    if (isPlanning) return;
    setIsPlanning(true);
    setPlanError(null);
    setIsCached(false);
    setPlanResult(null);
    setBookedSuccess(null);
    setConflictError(false);

    try {
      const res = await apiClient.farmer.plan({
        village_id: selectedVillageId,
        crop_stage: cropStage,
        language: profile?.language || 'en',
      });
      const data = res.data;
      const isBestDayValid = isWithinWeekIST(data?.best_day);
      const isMachineValid = !data?.machine_option?.date || isWithinWeekIST(data?.machine_option?.date);
      if (!isBestDayValid || !isMachineValid) {
        setPlanResult(null);
        setPlanError('No valid plan for this week yet');
        localStorage.removeItem('lastPlanResult');
      } else {
        setPlanResult(data);
        localStorage.setItem('lastPlanResult', JSON.stringify(data));
      }
    } catch (err: any) {
      console.error(err);
      const cached = localStorage.getItem('lastPlanResult');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const isBestDayValid = isWithinWeekIST(parsed?.best_day);
          const isMachineValid = !parsed?.machine_option?.date || isWithinWeekIST(parsed?.machine_option?.date);
          if (isBestDayValid && isMachineValid) {
            setPlanResult(parsed);
            setIsCached(true);
          } else {
            localStorage.removeItem('lastPlanResult');
            setPlanError('No valid plan for this week yet');
          }
        } catch {
          setPlanError('Network error. Please try again.');
        }
      } else {
        setPlanError('Network error. Please try again.');
      }
    } finally {
      setIsPlanning(false);
    }
  };

  const handleConfirmBooking = async (slotId: string, date: string, machineType: string) => {
    if (isBooking) return;
    setIsBooking(true);
    setConflictError(false);
    setBookError(null);

    try {
      const res = await apiClient.farmer.book({
        slot_id: slotId,
        village_id: selectedVillageId || profile?.village_id || 'village-patiala-001',
        date,
      });
      setBookedSuccess({
        booking_id: res.data.booking_id,
        date,
        machine_type: machineType,
      });
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes('409') || err?.message?.includes('Conflict')) {
        setConflictError(true);
      } else {
        setBookError(err?.message || 'Failed to complete booking. Please try again.');
      }
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="w-full pb-12">
      {/* Secondary Top Bar for Back Affordance */}
      <div className="sticky top-0 lg:top-16 z-[40] border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/farmer')}
          className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors cursor-pointer"
        >
          <LuArrowLeft className="w-5 h-5" />
          <span className="font-semibold text-sm">Back to Dashboard</span>
        </button>
        <button
          onClick={() => router.push('/farmer/field')}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--emerald)] hover:underline font-semibold"
        >
          <LuCalendar className="w-4 h-4" />
          <span>View Schedule & Calendar</span>
        </button>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">
              Book a Machine & Plan Clearing
            </h1>
            <p className="text-xs text-[var(--text-mid)] mt-1">
              Find optimal weather conditions, match with Happy Seeder equipment, or route straw to nearby aggregators.
            </p>
          </div>
        </div>

        {/* Booking Confirmed Banner */}
        {bookedSuccess && (
          <GlassCard data-accent="emerald" className="border-[var(--emerald)]/40 p-6 space-y-3 bg-[var(--emerald)]/10 animate-in fade-in">
            <div className="flex items-center gap-3 text-[var(--emerald)]">
              <div className="w-10 h-10 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center shrink-0">
                <LuCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-hi)]">Booking Confirmed!</h3>
                <p className="text-xs text-[var(--text-mid)]">
                  Booking ID: <span className="font-mono font-bold text-[var(--emerald)]">{bookedSuccess.booking_id}</span> • Date: {bookedSuccess.date}
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text-hi)]">
              Your <strong>{bookedSuccess.machine_type}</strong> slot is reserved. The machine owner and custom hiring center will contact you prior to deployment.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <PillButton variant="accent" onClick={() => router.push('/farmer/field')} className="text-xs px-4">
                View on Calendar
              </PillButton>
              <PillButton variant="glass" onClick={() => router.push('/farmer')} className="text-xs px-4">
                Go to Dashboard
              </PillButton>
            </div>
          </GlassCard>
        )}

        {/* 409 Conflict Error */}
        {conflictError && (
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <LuInfo className="w-4 h-4 shrink-0 text-amber-400" />
              <span><strong>Conflict (HTTP 409):</strong> That slot was just reserved by another farmer. Please re-run the plan to select another slot or choose straw disposal.</span>
            </div>
            <PillButton variant="accent" onClick={runPlan} className="text-xs px-3 shrink-0">
              Refresh Plan
            </PillButton>
          </div>
        )}

        {bookError && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <LuInfo className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{bookError}</span>
          </div>
        )}

        {/* Form Section */}
        <GlassCard className="space-y-4">
          {loadingProfile ? (
            <p className="text-[var(--text-mid)] animate-pulse">Loading profile...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider mb-2">
                  Village
                </label>
                <select
                  className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-hi)] outline-none focus:border-[var(--emerald)] transition-colors"
                  value={selectedVillageId}
                  onChange={(e) => setSelectedVillageId(e.target.value)}
                >
                  {villages.map((v) => (
                    <option key={v.village_id} value={v.village_id}>
                      {v.name} ({v.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider mb-2">
                  Crop Stage
                </label>
                <select
                  className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-hi)] outline-none focus:border-[var(--emerald)] transition-colors"
                  value={cropStage}
                  onChange={(e) => setCropStage(e.target.value as any)}
                >
                  <option value="standing">Standing</option>
                  <option value="harvested">Harvested</option>
                  <option value="partially_cleared">Partially Cleared</option>
                </select>
              </div>

              <div className="pt-2">
                <PillButton
                  onClick={runPlan}
                  disabled={isPlanning}
                  variant="accent"
                  className="w-full sm:w-auto"
                >
                  {isPlanning ? 'Analyzing & Finding Machine...' : 'Find Machine & Clearing Plan'}
                </PillButton>
              </div>
            </>
          )}
        </GlassCard>

        {/* Loading State Skeleton */}
        {isPlanning && (
          <GlassCard className="border border-[var(--emerald)]/20 relative overflow-hidden">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-32 bg-[var(--bg-2)] rounded"></div>
              <div className="h-12 w-64 bg-[var(--bg-2)] rounded"></div>
              <div className="h-16 w-full bg-[var(--bg-2)] rounded"></div>
            </div>
            <div className="mt-6 p-4 bg-[var(--bg-1)] rounded-xl border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--emerald)] border-t-transparent animate-spin"></div>
                <span className="text-[var(--emerald)] font-medium">
                  {agentSteps[currentStepIndex]}
                </span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Error / Offline Fallback Label */}
        {planError && !isCached && (
          <GlassCard
            data-accent="red"
            className="border-amber-500/30 text-amber-300 p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <LuInfo className="w-5 h-5 shrink-0 text-amber-400" />
              <span>{planError}</span>
            </div>
            <PillButton variant="accent" onClick={runPlan} disabled={isPlanning} className="text-xs">
              Retry
            </PillButton>
          </GlassCard>
        )}

        {/* Result */}
        {planResult && !isPlanning && (
          <>
            <GlassCard
              data-accent="emerald"
              className="border border-[var(--emerald)]/20 relative overflow-hidden"
            >
              <div className="!absolute top-0 right-0 w-64 h-64 bg-[var(--emerald)]/10 blur-[80px] rounded-full pointer-events-none -z-0" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Chip
                      variant="accent"
                      className="bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20"
                    >
                      {t('farmer.bestDay') || 'BEST CLEARING DAY'}
                    </Chip>
                    {isCached && (
                      <Chip
                        variant="outline"
                        className="bg-amber-500/10 text-amber-500 border-amber-500/20"
                      >
                        LAST RESULT (OFFLINE)
                      </Chip>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mb-4">
                  <h2 className="text-3xl md:text-5xl font-serif italic text-[var(--text-hi)]">
                    {formatIST(planResult.best_day, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </h2>
                  <div className="text-left md:text-right">
                    <span className="text-sm font-semibold text-[var(--emerald)]">
                      Score: {planResult.score}/100
                    </span>
                  </div>
                </div>

                {/* Multilingual Explanation */}
                <div className="p-4 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] mb-6">
                  <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-[var(--emerald)]">
                    <LuSparkles className="w-3.5 h-3.5" />
                    <span>Agent Recommendation</span>
                  </div>
                  <p className="text-sm text-[var(--text-hi)] leading-relaxed">
                    {planResult.reason_text}
                  </p>
                </div>

                {/* Score Breakdown Bars */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 mb-6">
                  <div className="bg-[var(--bg-0)] p-3 rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-low)] uppercase block mb-1">
                      Sowing
                    </span>
                    <span className="text-sm font-bold text-[var(--text-hi)]">
                      {planResult.score_breakdown.sowing_window}/25
                    </span>
                  </div>
                  <div className="bg-[var(--bg-0)] p-3 rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-low)] uppercase block mb-1">
                      Rain & Soil
                    </span>
                    <span className="text-sm font-bold text-[var(--text-hi)]">
                      {planResult.score_breakdown.rain_and_soil}/20
                    </span>
                  </div>
                  <div className="bg-[var(--bg-0)] p-3 rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-low)] uppercase block mb-1">
                      Wind
                    </span>
                    <span className="text-sm font-bold text-[var(--text-hi)]">
                      {planResult.score_breakdown.wind}/20
                    </span>
                  </div>
                  <div className="bg-[var(--bg-0)] p-3 rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-low)] uppercase block mb-1">
                      Fires
                    </span>
                    <span className="text-sm font-bold text-[var(--text-hi)]">
                      {planResult.score_breakdown.fire_activity}/15
                    </span>
                  </div>
                  <div className="bg-[var(--bg-0)] p-3 rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-low)] uppercase block mb-1">
                      Machine
                    </span>
                    <span className="text-sm font-bold text-[var(--text-hi)]">
                      {planResult.score_breakdown.machine_availability}/20
                    </span>
                  </div>
                </div>

                {/* Machine / Straw Option Card */}
                {planResult.machine_option ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--bg-0)] p-5 rounded-xl border border-[var(--border)] hover:border-[var(--emerald)]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] text-xl shrink-0">
                        <LuTractor />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base text-[var(--text-hi)]">
                            {planResult.machine_option.machine_type} Available
                          </h3>
                          <Chip variant="accent" className="bg-[var(--emerald)]/10 text-[var(--emerald)] text-[10px]">
                            Recommended
                          </Chip>
                        </div>
                        <p className="text-sm text-[var(--text-mid)]">
                          {planResult.machine_option.owner_label} • {planResult.machine_option.date}
                        </p>
                      </div>
                    </div>
                    <PillButton
                      variant="accent"
                      disabled={isBooking}
                      onClick={() =>
                        handleConfirmBooking(
                          planResult.machine_option!.slot_id,
                          planResult.best_day,
                          planResult.machine_option!.machine_type
                        )
                      }
                      className="shrink-0"
                    >
                      {isBooking ? 'Reserving...' : 'Confirm Machine Booking'}
                    </PillButton>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--bg-0)] p-5 rounded-xl border border-[var(--border)]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-xl shrink-0">
                        <LuMap />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-hi)]">No machines free for this date</h3>
                        <p className="text-sm text-[var(--text-mid)]">
                          Deliver your stubble to a verified straw aggregator or depot nearby.
                        </p>
                      </div>
                    </div>
                    <PillButton
                      variant="primary-silver"
                      onClick={() => router.push('/farmer/straw-outlets')}
                    >
                      View Straw Outlets
                    </PillButton>
                  </div>
                )}
              </div>
            </GlassCard>

            <AgentLogAccordion
              accent="emerald"
              toolTraces={(planResult.tool_trace || []).slice(0, visibleTraceCount)}
              title="Agent Execution Trace"
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function BookMachinePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Loading machine booking...</div>}>
      <BookMachineContent />
    </Suspense>
  );
}
