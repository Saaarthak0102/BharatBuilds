'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { apiClient } from '@/lib/api/client';
import { FarmerBooking, FarmerBookingsResponse } from '@/lib/types';
import { formatIST, todayIST } from '@/lib/utils/date';
import {
  LuArrowLeft,
  LuCalendar,
  LuTractor,
  LuCheck,
  LuClock,
  LuX,
  LuChevronLeft,
  LuChevronRight,
  LuSparkles,
  LuLeaf,
  LuShieldCheck,
} from 'react-icons/lu';

export default function FarmerFieldPlannerPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<FarmerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<FarmerBooking | null>(null);

  // Calendar month navigation state (defaults to current date)
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    apiClient.farmer
      .getBookings()
      .then((res) => {
        setBookings(res.data.bookings || []);
      })
      .catch((err) => {
        console.error('Failed to load bookings', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Calendar helpers
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Map bookings by date string YYYY-MM-DD
  const bookingsByDate = new Map<string, FarmerBooking[]>();
  bookings.forEach((b) => {
    const dStr = b.date ? b.date.slice(0, 10) : '';
    if (dStr) {
      const list = bookingsByDate.get(dStr) || [];
      list.push(b);
      bookingsByDate.set(dStr, list);
    }
  });

  const todayStr = todayIST();

  return (
    <div className="w-full pb-16 min-h-screen">
      {/* Top Bar for Back Navigation */}
      <div className="sticky top-0 lg:top-16 z-[40] border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/farmer')}
          className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors cursor-pointer"
        >
          <LuArrowLeft className="w-5 h-5" />
          <span className="font-semibold text-sm">Back to Dashboard</span>
        </button>

        <PillButton
          variant="accent"
          onClick={() => router.push('/farmer/book')}
          className="text-xs px-4"
        >
          <LuTractor className="w-3.5 h-3.5 mr-1" />
          Book Machine
        </PillButton>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 mt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">
            Field Schedule & Planner Calendar
          </h1>
          <p className="text-xs text-[var(--text-mid)] mt-1">
            Tap any marked date on the calendar card to view full machine booking details and schedule.
          </p>
        </div>

        {/* ─── CALENDAR CARD ──────────────────────────────────────────────── */}
        <GlassCard data-accent="emerald" className="p-6 rounded-2xl border border-[var(--border)] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--emerald)]/15 border border-[var(--emerald)]/30 flex items-center justify-center text-[var(--emerald)]">
                <LuCalendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-hi)]">{monthName}</h2>
                <p className="text-[11px] text-[var(--text-mid)]">
                  {bookings.length} recorded booking{bookings.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="w-8 h-8 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-[var(--text-mid)] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <LuChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date())}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-[var(--text-mid)] hover:text-white transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="w-8 h-8 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-[var(--text-mid)] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <LuChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-low)] py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 sm:h-18 rounded-xl bg-transparent" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayBookings = bookingsByDate.get(dateStr) || [];
              const isToday = dateStr === todayStr;
              const hasBookings = dayBookings.length > 0;

              const status = hasBookings ? dayBookings[0].status : null;
              const isCompleted = status === 'COMPLETED';
              const isPending = status === 'PENDING';
              const isConfirmed = status === 'CONFIRMED';

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => {
                    if (hasBookings) {
                      setSelectedBooking(dayBookings[0]);
                    }
                  }}
                  disabled={!hasBookings}
                  className={`h-14 sm:h-18 p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative ${
                    hasBookings
                      ? 'cursor-pointer hover:scale-105 shadow-md ' +
                        (isCompleted
                          ? 'bg-emerald-950/40 border-[var(--emerald)]/50 text-[var(--emerald)]'
                          : isPending
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                          : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300')
                      : 'bg-[var(--bg-1)]/40 border-[var(--border)]/60 text-[var(--text-mid)]'
                  } ${isToday ? 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-0)]' : ''}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        hasBookings ? 'text-white' : 'text-[var(--text-low)]'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" title="Today" />
                    )}
                  </div>

                  {hasBookings && (
                    <div className="w-full">
                      <div className="text-[9px] sm:text-[10px] truncate font-semibold leading-tight flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isCompleted ? 'bg-[var(--emerald)]' : isPending ? 'bg-amber-400' : 'bg-cyan-400'
                          }`}
                        />
                        <span className="truncate">{dayBookings[0].machine_type.split(' ')[0]}</span>
                      </div>
                      <span className="text-[8px] uppercase tracking-wider text-[var(--text-low)] block truncate">
                        {status}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {/* ─── BOOKINGS LIST OVERVIEW ─────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-mid)]">
              All Bookings ({bookings.length})
            </h3>
            <span className="text-xs text-[var(--text-low)]">Click any item for details</span>
          </div>

          {loading ? (
            <p className="text-xs text-[var(--text-low)] py-4 animate-pulse">Loading bookings schedule...</p>
          ) : bookings.length === 0 ? (
            <GlassCard className="p-6 text-center text-xs text-[var(--text-mid)]">
              No machine bookings found yet.{' '}
              <button
                type="button"
                onClick={() => router.push('/farmer/book')}
                className="text-[var(--emerald)] underline font-bold"
              >
                Book your first machine slot &rarr;
              </button>
            </GlassCard>
          ) : (
            <div className="space-y-2.5">
              {bookings.map((b) => {
                const s = b.status?.toLowerCase();
                const isComp = s === 'completed';
                const isPend = s === 'pending';
                const badgeClass = isComp
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : isPend
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';

                return (
                  <button
                    key={b.booking_id}
                    type="button"
                    onClick={() => setSelectedBooking(b)}
                    className="w-full text-left p-3.5 rounded-xl bg-[var(--bg-1)]/70 hover:bg-[var(--bg-2)]/80 border border-[var(--border)] hover:border-[var(--emerald)]/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--emerald)]/10 border border-[var(--emerald)]/20 flex items-center justify-center text-[var(--emerald)] shrink-0 group-hover:scale-105 transition-transform">
                        <LuTractor className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[var(--text-hi)] truncate leading-tight">
                          {b.machine_type}
                        </h4>
                        <p className="text-xs text-[var(--text-mid)] truncate mt-0.5">
                          {formatIST(b.date, { weekday: 'short', month: 'short', day: 'numeric' })} • {b.owner_label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeClass}`}>
                        {b.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── POPUP CALENDAR CARD MODAL ────────────────────────────────────── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-0)] border border-[var(--emerald)]/40 shadow-2xl p-6 relative space-y-5 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-[var(--text-low)] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <LuX className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--emerald)]/20 border border-[var(--emerald)]/40 flex items-center justify-center text-[var(--emerald)] text-xl shrink-0">
                <LuTractor className="w-6 h-6" />
              </div>
              <div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider inline-block mb-1 ${
                    selectedBooking.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : selectedBooking.status === 'PENDING'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {selectedBooking.status}
                </span>
                <h3 className="text-lg font-bold text-[var(--text-hi)] leading-tight">
                  {selectedBooking.machine_type}
                </h3>
              </div>
            </div>

            {/* Details Grid */}
            <div className="p-4 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[var(--border)]/60">
                <span className="text-[var(--text-low)]">Booking Date:</span>
                <span className="font-semibold text-[var(--text-hi)]">
                  {formatIST(selectedBooking.date, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--border)]/60">
                <span className="text-[var(--text-low)]">Booking ID:</span>
                <span className="font-mono font-bold text-[var(--emerald)]">{selectedBooking.booking_id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--border)]/60">
                <span className="text-[var(--text-low)]">Provider / Hub:</span>
                <span className="font-medium text-[var(--text-hi)] text-right max-w-[60%] truncate">
                  {selectedBooking.owner_label}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[var(--border)]/60">
                <span className="text-[var(--text-low)]">Field Coverage:</span>
                <span className="font-medium text-[var(--text-hi)]">{selectedBooking.acres || 5} acres</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[var(--text-low)]">Smoke Avoidance:</span>
                <span className="font-semibold text-[var(--emerald)] flex items-center gap-1">
                  <LuShieldCheck className="w-3.5 h-3.5" />
                  ~{Math.round((selectedBooking.acres || 5) * 14.3)} kg PM2.5 saved
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <PillButton
                variant="accent"
                onClick={() => {
                  setSelectedBooking(null);
                  router.push('/farmer/book');
                }}
                className="w-full text-xs"
              >
                Book Another Machine
              </PillButton>
              <PillButton
                variant="glass"
                onClick={() => setSelectedBooking(null)}
                className="w-full text-xs"
              >
                Close
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
