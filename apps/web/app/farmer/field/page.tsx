'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { AgentLogAccordion } from '@/components/dashboard/AgentLogAccordion';
import { useT } from '@/lib/i18n/useT';
import { apiClient } from '@/lib/api/client';
import { mockVillages } from '@/lib/mock/villages';
import { PlanResult, FarmerProfile } from '@/lib/types';
import { LuArrowLeft, LuTractor, LuMap, LuInfo } from 'react-icons/lu';

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
      setPlanResult(res.data);
      localStorage.setItem('lastPlanResult', JSON.stringify(res.data));
    } catch (err: any) {
      console.error(err);
      const cached = localStorage.getItem('lastPlanResult');
      if (cached) {
        try {
          setPlanResult(JSON.parse(cached));
          setIsCached(true);
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
                    {mockVillages.map(v => (
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
            <GlassCard data-accent="red" className="border-red-500/20 text-red-400">
               <div className="flex items-center gap-2"><LuInfo className="w-5 h-5 shrink-0" /> {planError}</div>
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
                  
                  <div className="flex items-end gap-4 mb-6 flex-wrap">
                    <div className="text-4xl md:text-5xl font-serif italic text-[var(--text-hi)]">
                      {new Date(planResult.best_day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
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
                    {planResult.reason_text}
                  </p>

                  <div className="text-xs text-[var(--text-low)] mb-8 italic">
                    Note: This is guidance, not a guarantee. Updated just now.
                  </div>
                  
                  {/* Machine / Outlet Call to action */}
                  {planResult.machine_option ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--bg-0)] p-4 rounded-xl border border-[var(--border)] group hover:border-[var(--emerald)]/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] text-xl shrink-0 group-hover:scale-110 transition-transform">
                          <LuTractor />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--text-hi)]">{planResult.machine_option.machine_type} Available</h3>
                          <p className="text-sm text-[var(--text-mid)]">{planResult.machine_option.owner_label}</p>
                        </div>
                      </div>
                      <PillButton 
                        variant="accent"
                        onClick={() => router.push(`/farmer/book?slot_id=${planResult.machine_option!.slot_id}&date=${planResult.best_day}`)}
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
                          <p className="text-sm text-[var(--text-mid)]">Consider delivering to a straw outlet nearby.</p>
                        </div>
                      </div>
                      <PillButton 
                        variant="primary-silver"
                        onClick={() => router.push('/farmer/straw-outlets')}
                      >
                        View Outlets
                      </PillButton>
                    </div>
                  )}
                </div>
             </GlassCard>

             <AgentLogAccordion
               accent="emerald"
               toolTraces={planResult.tool_trace || []}
               title="Agent Trace"
             />
           </>
         )}
      </div>
    </div>
  );
}
