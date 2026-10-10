'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { apiClient } from '@/lib/api/client';
import { LuArrowLeft, LuTractor, LuCheck, LuInfo, LuMap } from 'react-icons/lu';
import { useT } from '@/lib/i18n/useT';
import { FarmerProfile, PlanResult } from '@/lib/types';

function BookAgentFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useT();

  const urlSlotId = searchParams.get('slot_id');
  const urlDate = searchParams.get('date');

  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Agent State
  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // Booking State
  const [isBooking, setIsBooking] = useState(false);
  const [successData, setSuccessData] = useState<{ booking_id: string; status: string } | null>(null);
  const [conflictError, setConflictError] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [idempotencyKey] = useState(() => Math.random().toString(36).substring(2, 15));

  useEffect(() => {
    apiClient.farmer.getProfile().then(res => {
      setProfile(res.data);
      // set defaults
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setEndDate(nextWeek.toISOString().split('T')[0]);
    }).catch(err => {
      console.error(err);
      setGeneralError("Could not load profile. Please try again.");
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const runAgent = async () => {
    if (!profile) return;
    setIsPlanning(true);
    setPlanError(null);
    setPlanResult(null);

    try {
      const res = await apiClient.farmer.plan({
        village_id: profile.village_id,
        crop_stage: profile.crop_stage,
        language: profile.language || 'en',
        start_date: startDate,
        end_date: endDate
      });
      setPlanResult(res.data);
    } catch (err: any) {
      setPlanError(err.message || "Failed to find options. Please try again.");
    } finally {
      setIsPlanning(false);
    }
  };

  const confirmBooking = async (slotIdToBook: string, dateToBook: string) => {
    if (!profile || isBooking) return;
    
    setIsBooking(true);
    setConflictError(false);
    setGeneralError(null);

    try {
      const res = await apiClient.farmer.book({
        slot_id: slotIdToBook,
        village_id: profile.village_id,
        date: dateToBook,
        idempotency_key: idempotencyKey,
      });
      setSuccessData({ booking_id: res.data.booking_id, status: res.data.status });
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.toLowerCase().includes('conflict') || err.message?.includes('just taken')) {
        setConflictError(true);
      } else {
        setGeneralError("Failed to book slot. Please try again.");
      }
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full pb-12 pt-6">
        <div className="w-full max-w-2xl mx-auto px-4 lg:px-6">
          <GlassCard className="flex items-center justify-center h-48">
            <p className="text-[var(--text-mid)] animate-pulse">Loading...</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  // State 4: Conflict Error
  if (conflictError) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 lg:px-6 mt-6">
        <GlassCard data-accent="red" className="border-red-500/20 py-6">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <LuInfo className="w-6 h-6" />
            <h2 className="text-xl font-bold">That slot was just taken</h2>
          </div>
          <p className="text-[var(--text-mid)] mb-6">
            Unfortunately, someone else booked this machine while you were reviewing. What would you like to do?
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
             <PillButton variant="accent" onClick={() => { setConflictError(false); setPlanResult(null); }}>
              Retry Search
            </PillButton>
            <PillButton variant="primary-silver" onClick={() => router.push('/farmer/straw-outlets')}>
              View Straw Outlets
            </PillButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  // State 3: Success
  if (successData) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 lg:px-6 mt-6">
        <GlassCard data-accent="emerald" className="border border-[var(--emerald)]/20 text-center py-8">
          <div className="w-16 h-16 rounded-full bg-[var(--emerald)]/20 text-[var(--emerald)] flex items-center justify-center mx-auto mb-4">
            <LuCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif italic text-[var(--text-hi)] mb-2">Booking Confirmed</h2>
          <p className="text-[var(--text-mid)] mb-6">Your machine slot has been successfully booked.</p>
          
          <div className="flex flex-col items-center gap-2 mb-8">
            <Chip variant="accent">STATUS: {successData.status.toUpperCase()}</Chip>
            <div className="text-sm text-[var(--text-low)] font-mono">ID: {successData.booking_id}</div>
          </div>

          <PillButton onClick={() => router.push('/farmer')} variant="accent">
            Back to Dashboard
          </PillButton>
        </GlassCard>
      </div>
    );
  }

  // State 2: URL Direct Booking (Fallback for planner links)
  if (urlSlotId && urlDate && !planResult) {
    return (
       <div className="w-full pb-12">
        <div className="sticky top-0 lg:top-16 z-[40] border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-md px-4 py-3 flex items-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors">
            <LuArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm">Back</span>
          </button>
        </div>
        <div className="w-full max-w-2xl mx-auto px-4 lg:px-6 mt-6 space-y-6">
            <GlassCard>
              <h1 className="text-2xl font-serif italic text-[var(--text-hi)] mb-6">{t('farmer.bookMachine') || "Book Machine"}</h1>
              
              <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-4 mb-6 space-y-4">
                <div className="flex items-center gap-4 border-b border-[var(--border)] pb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)]">
                    <LuTractor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-hi)]">Happy Seeder</h3>
                    <p className="text-sm text-[var(--text-mid)]">Slot ID: {urlSlotId}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--text-low)] uppercase tracking-wider mb-1">Date</div>
                    <div className="text-sm text-[var(--text-hi)]">{new Date(urlDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--text-low)] uppercase tracking-wider mb-1">Location</div>
                    <div className="text-sm text-[var(--text-hi)]">{profile?.village_name || profile?.village_id}</div>
                  </div>
                </div>
              </div>

              {generalError && (
                <div className="mb-4 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {generalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => router.back()} 
                  className="px-4 py-2 text-sm font-medium text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors"
                  disabled={isBooking}
                >
                  Cancel
                </button>
                <PillButton variant="accent" onClick={() => confirmBooking(urlSlotId, urlDate)} disabled={isBooking}>
                  {isBooking ? "Confirming..." : "Confirm Booking"}
                </PillButton>
              </div>
            </GlassCard>
        </div>
      </div>
    );
  }

  // State 1: Agent Flow (Form + Recommendation)
  return (
    <div className="w-full pb-12">
      <div className="sticky top-0 lg:top-16 z-[40] border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-md px-4 py-3 flex items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors">
          <LuArrowLeft className="w-5 h-5" />
          <span className="font-semibold text-sm">Back</span>
        </button>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 lg:px-6 mt-6 space-y-6">
        <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">Find the best machine</h1>
        
        {/* Step 1: Form */}
        {!planResult && (
          <GlassCard className="space-y-4 border border-[var(--emerald)]/20 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--emerald)]/10 blur-[40px] rounded-full pointer-events-none" />
            
            <p className="text-[var(--text-mid)] text-sm mb-4">
              Our intelligent agent will find the most suitable machine for you by checking local weather, wind patterns, and availability.
            </p>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider mb-2">Location</label>
                  <div className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-hi)] opacity-80 cursor-not-allowed">
                    {profile?.village_name || profile?.village_id}
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider mb-2">Crop Stage</label>
                  <div className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-hi)] opacity-80 cursor-not-allowed capitalize">
                    {profile?.crop_stage.replace('_', ' ')}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
               <div>
                  <label className="block text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider mb-2">Earliest Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-hi)] outline-none focus:border-[var(--emerald)]" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider mb-2">Latest Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-[var(--bg-2)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-hi)] outline-none focus:border-[var(--emerald)]" />
               </div>
            </div>

            {planError && (
              <div className="mt-4 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {planError}
              </div>
            )}

            <div className="pt-4">
              <PillButton onClick={runAgent} disabled={isPlanning} variant="accent" className="w-full shadow-lg shadow-emerald-500/20">
                {isPlanning ? "Agent is searching..." : "Find best option"}
              </PillButton>
            </div>
          </GlassCard>
        )}

        {/* Step 2: Agent Loading */}
        {isPlanning && (
           <GlassCard className="border border-[var(--emerald)]/20 flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full border-4 border-[var(--emerald)] border-t-transparent animate-spin mb-4"></div>
              <p className="text-[var(--emerald)] font-medium">Assessing weather, fire risk, and machine availability...</p>
           </GlassCard>
        )}

        {/* Step 3: Agent Recommendation */}
        {planResult && !isPlanning && (
          <GlassCard data-accent="emerald" className="border border-[var(--emerald)]/20">
            <div className="flex items-center justify-between mb-4">
              <Chip variant="accent" className="bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20">
                AGENT RECOMMENDATION
              </Chip>
              {planResult.is_sample && <SampleDataBadge />}
            </div>

            <p className="text-lg text-[var(--text-hi)] leading-relaxed mb-6">
              {planResult.reason_text}
            </p>

            {planResult.machine_option ? (
               <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-4 border-b border-[var(--border)] pb-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)]">
                      <LuTractor className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-hi)]">{planResult.machine_option.machine_type}</h3>
                      <p className="text-sm text-[var(--text-mid)]">{planResult.machine_option.owner_label}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-low)] uppercase tracking-wider mb-1">Date</div>
                      <div className="text-sm text-[var(--text-hi)]">{new Date(planResult.machine_option.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-low)] uppercase tracking-wider mb-1">Price</div>
                      <div className="text-sm text-[var(--text-hi)]">Standard rates</div>
                    </div>
                  </div>
               </div>
            ) : (
               <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start gap-4 text-amber-500">
                  <LuInfo className="w-6 h-6 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-bold mb-1">No machines available in this window</h3>
                    <p className="text-sm text-amber-500/80">
                      The agent could not find a suitable machine slot that satisfies all weather and timing constraints.
                    </p>
                  </div>
               </div>
            )}

            {generalError && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {generalError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4">
               {planResult.machine_option ? (
                 <>
                  <PillButton variant="accent" className="w-full sm:w-auto" onClick={() => confirmBooking(planResult.machine_option!.slot_id, planResult.machine_option!.date)} disabled={isBooking}>
                    {isBooking ? "Confirming..." : "Confirm Booking"}
                  </PillButton>
                  <button onClick={() => setPlanResult(null)} className="px-4 py-2 text-sm font-medium text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors">
                    Change Preferences
                  </button>
                 </>
               ) : (
                 <>
                   <PillButton variant="primary-silver" onClick={() => router.push('/farmer/straw-outlets')} className="w-full sm:w-auto">
                     View Straw Outlets
                   </PillButton>
                   <button onClick={() => setPlanResult(null)} className="px-4 py-2 text-sm font-medium text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors">
                    Try different dates
                  </button>
                 </>
               )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

export default function FarmerBookPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[var(--text-mid)]">Loading...</div>}>
      <BookAgentFlow />
    </Suspense>
  );
}
