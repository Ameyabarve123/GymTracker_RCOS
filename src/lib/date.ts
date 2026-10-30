import { format } from 'date-fns';

/** Local calendar date as an ISO `yyyy-MM-dd` string (no timezone shift). */
export function toDateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/** Human friendly label, e.g. "Mon, Jan 5". */
export function formatPretty(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'EEE, MMM d');
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}
