export const TIMEZONE_IST = 'Asia/Kolkata';

/**
 * Format a date in Asia/Kolkata timezone.
 * Example output: "Tuesday, Nov 5" or "16 Sep"
 */
export function formatIST(
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' }
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE_IST, ...options }).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Returns today's date as YYYY-MM-DD strictly in Asia/Kolkata.
 */
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Offset date by n days strictly in Asia/Kolkata (YYYY-MM-DD).
 */
export function addDaysIST(n: number, baseDate: Date | string = new Date()): string {
  try {
    const base = typeof baseDate === 'string' ? new Date(baseDate) : baseDate;
    const target = new Date(base.getTime() + n * 86400000);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE_IST,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(target);
  } catch {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }
}

/**
 * Format time in Asia/Kolkata timezone.
 * Example output: "10:15 AM"
 */
export function timeIST(
  date: Date | string | number = new Date(),
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE_IST, ...options }).format(d);
  } catch {
    return '';
  }
}

/**
 * Relative time ago from an ISO or epoch timestamp.
 * Returns human-readable relative string: "just now", "5m ago", "2h ago", "1d ago".
 */
export function relativeAgo(ts: Date | string | number | null | undefined): string {
  if (!ts) return '—';
  try {
    const d = typeof ts === 'string' || typeof ts === 'number' ? new Date(ts) : ts;
    const timeMs = d.getTime();
    if (isNaN(timeMs)) return String(ts);

    const diffSeconds = Math.floor((Date.now() - timeMs) / 1000);
    if (diffSeconds < 60) return 'just now';
    const mins = Math.floor(diffSeconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatIST(d, { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

// Backward compatibility aliases
export const formatKolkataDate = formatIST;
export const formatKolkataTime = timeIST;
export const getKolkataISODate = (offsetDays: number = 0) => addDaysIST(offsetDays);

/**
 * Validates if date string YYYY-MM-DD is within [todayIST(), addDaysIST(6)].
 */
export function isWithinWeekIST(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const iso = dateStr.slice(0, 10);
  const start = todayIST();
  const end = addDaysIST(6);
  return iso >= start && iso <= end;
}
