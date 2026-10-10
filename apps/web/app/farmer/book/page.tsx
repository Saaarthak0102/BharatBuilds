'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { apiClient } from '@/lib/api/client';
import { LuArrowLeft, LuTractor, LuCheck, LuInfo } from 'react-icons/lu';
import { useT } from '@/lib/i18n/useT';

function BookForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useT();

  const slot_id = searchParams.get('slot_id');
  const date = searchParams.get('date');

  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [villageId, setVillageId] = useState<string | null>(null);
  
  const [successData, setSuccessData] = useState<{ booking_id: string; status: string } | null>(null);
  const [conflictError, setConflictError] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Generate idempotency key once per page load
  const [idempotencyKey] = useState(() => Math.random().toString(36).substring(2, 15));

  useEffect(() => {
    if (!slot_id || !date) {
      router.replace('/farmer/field');
      return;
    }
    
    apiClient.farmer.getProfile().then(res => {
      setVillageId(res.data.village_id);
    }).catch(err => {
      console.error(err);
      setGeneralError("Could not load profile. Please try again.");
    }).finally(() => {
      setLoading(false);
    });
  }, [slot_id, date, router]);

  const confirmBooking = async () => {
    if (!villageId || !slot_id || !date || isBooking) return;
    
    setIsBooking(true);
    setConflictError(false);
    setGeneralError(null);

    try {
      const res = await apiClient.farmer.book({
        slot_id,
        village_id: villageId,
        date,
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

  if (!slot_id || !date) {
    return null; // Will redirect
  }

  return (
    <div className="w-full pb-12">
      <div className="sticky top-0 lg:top-16 z-[40] border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-md px-4 py-3 flex items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors">
          <LuArrowLeft className="w-5 h-5" />
          <span className="font-semibold text-sm">Back</span>
        </button>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 lg:px-6 mt-6 space-y-6">
        {loading ? (
          <GlassCard className="flex items-center justify-center h-48">
            <p className="text-[var(--text-mid)] animate-pulse">Loading...</p>
          </GlassCard>
        ) : successData ? (
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
        ) : conflictError ? (
          <GlassCard data-accent="red" className="border-red-500/20 py-6">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <LuInfo className="w-6 h-6" />
              <h2 className="text-xl font-bold">That slot was just taken</h2>
            </div>
            <p className="text-[var(--text-mid)] mb-6">
              Unfortunately, someone else booked this machine while you were reviewing. What would you like to do?
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <PillButton variant="accent" onClick={() => router.push('/farmer/field')}>
                Find Next-Best Day
              </PillButton>
              <PillButton variant="primary-silver" onClick={() => router.push('/farmer/straw-outlets')}>
                View Straw Outlets
              </PillButton>
            </div>
          </GlassCard>
        ) : (
          <GlassCard>
            <h1 className="text-2xl font-serif italic text-[var(--text-hi)] mb-6">{t('farmer.bookMachine') || "Book Machine"}</h1>
            
            <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-4 mb-6 space-y-4">
              <div className="flex items-center gap-4 border-b border-[var(--border)] pb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)]">
                  <LuTractor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-hi)]">Happy Seeder</h3>
                  <p className="text-sm text-[var(--text-mid)]">Slot ID: {slot_id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-[var(--text-low)] uppercase tracking-wider mb-1">Date</div>
                  <div className="text-sm text-[var(--text-hi)]">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--text-low)] uppercase tracking-wider mb-1">Location</div>
                  <div className="text-sm text-[var(--text-hi)]">Kisan Seva Kendra</div>
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
              <PillButton variant="accent" onClick={confirmBooking} disabled={isBooking}>
                {isBooking ? "Confirming..." : "Confirm Booking"}
              </PillButton>
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
      <BookForm />
    </Suspense>
  );
}
