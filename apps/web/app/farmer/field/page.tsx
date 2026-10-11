'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { AgentLogAccordion } from '@/components/dashboard/AgentLogAccordion';
import { useT } from '@/lib/i18n/useT';
import { apiClient } from '@/lib/api/client';
import { villages } from '@/lib/data/reference';
import { PlanResult, FarmerProfile } from '@/lib/types';
import { formatIST, isWithinWeekIST } from '@/lib/utils/date';
import { LuArrowLeft, LuTractor, LuMap, LuInfo, LuSparkles } from 'react-icons/lu';

export default function FarmerFieldPlanner() {
  const router = useRouter();
  const { t } = useT();
  
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string>('');
  const [cropStage, setCropStage] = useState<'harvested' | 'partially_cleared' | 'standing'>('harvested');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const agentSteps = [
    "Checking weather forecast...",
    "Analyzing wind patterns...",
    "Checking local fire activity...",
    "Finding available machines...",
    "Finalizing best day..."
  ];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visibleTraceCount, setVisibleTraceCount] = useState<number>(0);

  useEffect(() => {
    apiClient.farmer.getProfile().then(res => {
      setProfile(res.data);
      setSelectedVillageId(res.data.village_id);
      setCropStage(res.data.crop_stage);
    }).catch(err => {
      console.error("Failed to load profile", err);
    }).finally(() => {
      setLoadingProfile(false);
    });
  }, []);

  useEffect(() => {
    if (isPlanning) {
      const interval = setInterval(() => {
        setCurrentStepIndex(prev => Math.min(prev + 1, agentSteps.length - 1));
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
    
    try {
      const res = await apiClient.farmer.plan({
        village_id: selectedVillageId,
        crop_stage: cropStage,
        language: profile?.language || 'en'
      });
      const data = res.data;
      const isBestDayValid = isWithinWeekIST(data?.best_day);
      const isMachineValid = !data?.machine_option?.date || isWithinWeekIST(data?.machine_option?.date);
      if (!isBestDayValid || !isMachineValid) {
        setPlanResult(null);
        setPlanError("No valid plan for this week yet");
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
            setPlanError("No valid plan for this week yet");
          }
        } catch (e) {
          setPlanError("Network error. Please try again.");
        }
      } else {
        setPlanError("Network error. Please try again.");
      }
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div className="w-full pb-12">
      {/* Secondary Top Bar for Back Affordance */}
      <div className="sticky top-0 lg:top-16 z-[40] border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-md px-4 py-3 flex items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors">
          <LuArrowLeft className="w-5 h-5" />
          <span className="font-semibold text-sm">Back</span>
        </button>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 mt-6 space-y-6">
         <div className="flex items-center justify-between">
           <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">{t('farmer.planner') || "Planner"}</h1>
         </div>

         {/* Form Section */}
         <GlassCard className="space-y-4">
           {loadingProfile ? (
             <p className="text-[var(--text-mid)] animate-pulse">Loading profile...</p>
           ) : (
             <>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider mb-2">Village</label>
                  <select 
                    className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-hi)] outline-none focus:border-[var(--emerald)] transition-colors"
                    value={selectedVillageId}
                    onChange={(e) => setSelectedVillageId(e.target.value)}
                  >
                    {villages.map(v => (
                      <option key={v.village_id} value={v.village_id}>{v.name} ({v.district})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider mb-2">Crop Stage</label>
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
                    {isPlanning ? "Planning..." : "Run Plan"}
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
                   <span className="text-[var(--emerald)] font-medium">{agentSteps[currentStepIndex]}</span>
                </div>
              </div>
           </GlassCard>
         )}

         {/* Error / Offline Fallback Label */}
         {planError && !isCached && (
            <GlassCard data-accent="red" className="border-amber-500/30 text-amber-300 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
             <GlassCard data-accent="emerald" className="border border-[var(--emerald)]/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--emerald)]/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Chip variant="accent" className="bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20">
                        {t('farmer.bestDay') || "BEST CLEARING DAY"}
                      </Chip>
                      {isCached && (
                        <Chip variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                          LAST RESULT (OFFLINE)
                        </Chip>
                      )}
                    </div>
                    {planResult.is_sample && <SampleDataBadge />}
                  </div>
                  
                  {planResult.sowing_window_status && planResult.sowing_window_status !== 'inside' && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-2">
                      <LuInfo className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <strong>Notice: Outside Recommended Sowing Window ({planResult.sowing_window_status}).</strong> Recommended window for this crop stage: {planResult.window_start} to {planResult.window_end}.
                      </div>
                    </div>
                  )}

                  {planResult.no_ideal_day && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2">
                      <LuInfo className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <strong>No Ideal Clearing Day Found: </strong>
                        Forecast conditions for the 7-day window ({planResult.window_start} to {planResult.window_end}) do not meet optimal criteria (score: {planResult.score}/100). The day shown is the best available option.
                      </div>
                    </div>
                  )}

                  <div className="flex items-end gap-4 mb-6 flex-wrap">
                    <div className="text-4xl md:text-5xl font-serif italic text-[var(--text-hi)]">
                      {formatIST(planResult.best_day, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-lg font-mono text-[var(--emerald)] mb-1">
                      Score {planResult.score}/100
                    </div>
                  </div>
                  
                  {/* Score breakdown bars */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                     {Object.entries(planResult.score_breakdown).map(([k, v]) => (
                       <div key={k} className="flex flex-col gap-1">
                         <div className="text-[10px] uppercase text-[var(--text-mid)] font-bold tracking-wider">{k.replace(/_/g, ' ')}</div>
                         <div className="w-full bg-[var(--bg-2)] h-2 rounded-full overflow-hidden">
                           <div className="h-full bg-[var(--emerald)] rounded-full" style={{ width: `${v}%` }}></div>
                         </div>
                       </div>
                     ))}
                  </div>
                  
                  <p className="text-lg md:text-xl text-[var(--text-hi)] leading-relaxed bg-[var(--bg-1)] p-5 rounded-2xl border border-[var(--border)] mb-6">
                    {planResult.sowing_window_status && planResult.sowing_window_status !== 'inside'
                      ? `[Notice: Outside recommended sowing window (${planResult.sowing_window_status})${planResult.window_start ? `: ${planResult.window_start} to ${planResult.window_end}` : ''}] ${planResult.reason_text}`
                      : planResult.no_ideal_day
                      ? `[Notice: No ideal clearing day found in 7-day forecast (Score: ${planResult.score}/100)] ${planResult.reason_text}`
                      : planResult.reason_text}
                  </p>

                  <div className="text-xs text-[var(--text-low)] mb-8 italic">
                    Note: This is guidance, not a guarantee. Updated just now.
                  </div>
                  
                  {/* Machine & Straw Outlets Layout */}
                  {(() => {
                    const topStrawOutlets = (planResult.straw_outlets || []).slice(0, 3);
                    const topOutletIds = topStrawOutlets.map((o) => o.outlet_id).filter(Boolean);

                    const strawOutletsSection = topStrawOutlets.length > 0 ? (
                      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-1)]/90 border border-[var(--border)] space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-[var(--text-hi)] text-base">
                                Prefer to sell your straw?
                              </h3>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Top 3 Ranked
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-mid)] mt-0.5">
                              Ranked deterministically by distance from your village, accepted residue, and pickup support.
                            </p>
                          </div>
                          <PillButton
                            variant="primary-silver"
                            onClick={() =>
                              router.push(
                                `/farmer/straw-outlets?recommended=${topOutletIds.join(',')}`
                              )
                            }
                            className="text-xs py-1.5 px-3.5 self-start sm:self-auto"
                          >
                            Browse All Outlets
                          </PillButton>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {topStrawOutlets.map((outlet, idx) => (
                            <div
                              key={outlet.outlet_id || idx}
                              className="p-3.5 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] hover:border-amber-400/50 transition-all flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Rank #{idx + 1}
                                  </span>
                                  <span className="text-xs font-semibold text-[var(--emerald)]">
                                    ~{outlet.distance_km} km
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-[var(--text-hi)] mb-1 leading-tight">
                                  {outlet.name}
                                </h4>
                                <div className="text-[11px] text-[var(--text-low)] capitalize mb-2">
                                  {(outlet.facility_type || '').replace(/_/g, ' ')} • {outlet.district}
                                </div>
                                <p className="text-xs text-[var(--text-mid)] bg-[var(--bg-1)] p-2 rounded-lg border border-[var(--border)] leading-relaxed">
                                  {outlet.reason || 'Residue match & proximate facility'}
                                </p>
                              </div>

                              <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                                <span className="text-[var(--text-low)]">
                                  Pickup: {outlet.pickup_support === 'yes' ? 'Available' : 'Drop-off only'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(
                                      `/farmer/straw-outlets?recommended=${topOutletIds.join(',')}`
                                    )
                                  }
                                  className="text-[var(--accent)] hover:underline font-semibold cursor-pointer"
                                >
                                  View details &rarr;
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;

                    const machineSection = planResult.machine_option ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--bg-0)] p-4 rounded-xl border border-[var(--border)] group hover:border-[var(--emerald)]/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] text-xl shrink-0 group-hover:scale-110 transition-transform">
                            <LuTractor />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[var(--text-hi)]">
                              {planResult.machine_option.machine_type} Available
                            </h3>
                            <p className="text-sm text-[var(--text-mid)]">
                              {planResult.machine_option.owner_label}
                            </p>
                          </div>
                        </div>
                        <PillButton
                          variant="accent"
                          onClick={() =>
                            router.push(
                              `/farmer/book?slot_id=${planResult.machine_option!.slot_id}&date=${planResult.best_day}`
                            )
                          }
                        >
                          Book Slot
                        </PillButton>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--bg-0)] p-4 rounded-xl border border-[var(--border)] group hover:border-amber-500/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-xl shrink-0 group-hover:scale-110 transition-transform">
                            <LuMap />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[var(--text-hi)]">No machines found</h3>
                            <p className="text-sm text-[var(--text-mid)]">
                              Consider delivering to a straw outlet nearby.
                            </p>
                          </div>
                        </div>
                        <PillButton
                          variant="primary-silver"
                          onClick={() => router.push('/farmer/straw-outlets')}
                        >
                          View Outlets
                        </PillButton>
                      </div>
                    );

                    // When no machine is free, straw outlets section is visually first
                    if (!planResult.machine_option) {
                      return (
                        <div className="space-y-4">
                          {strawOutletsSection}
                          {machineSection}
                        </div>
                      );
                    }

                    // Otherwise machine option is first, with straw outlets below
                    return (
                      <div className="space-y-4">
                        {machineSection}
                        {strawOutletsSection}
                      </div>
                    );
                  })()}
                </div>
             </GlassCard>

             <AgentLogAccordion
               accent="emerald"
               toolTraces={(planResult.tool_trace || []).slice(0, visibleTraceCount)}
               title="Agent Trace"
             />
           </>
         )}
      </div>
    </div>
  );
}
