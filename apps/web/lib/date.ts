export const TIMEZONE_KOLKATA = 'Asia/Kolkata';

/**
 * Format a date in Asia/Kolkata timezone.
 * Example output: "Tuesday, Nov 5" or "Oct 12"
 */
export function formatKolkataDate(
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' }
): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE_KOLKATA, ...options }).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Format time in Asia/Kolkata timezone.
 * Example output: "10:15 AM"
 */
export function formatKolkataTime(
  date: Date | string | number = new Date(),
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', { timeZone: TIMEZONE_KOLKATA, ...options }).format(d);
  } catch {
    return '';
  }
}

/**
 * Format full date and time in Asia/Kolkata timezone.
 * Example output: "Nov 5, 10:15 AM"
 */
export function formatKolkataDateTime(
  date: Date | string | number | null | undefined
): string {
  if (!date) return '';
  return formatKolkataDate(date, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get YYYY-MM-DD date string strictly computed in Asia/Kolkata timezone.
 * Safely offsets days without local/UTC midnight rollover errors.
 */
export function getKolkataISODate(offsetDays: number = 0, baseDate: Date = new Date()): string {
  try {
    const target = new Date(baseDate.getTime() + offsetDays * 86400000);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE_KOLKATA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(target);
  } catch {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }
}
