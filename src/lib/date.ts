import { format } from 'date-fns';

/** Local calendar date as an ISO `yyyy-MM-dd` string (no timezone shift). */
export function toDateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

const monthNames = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** English month names or numeric dates in local time. Two-digit years mean 2000–2099. */
export function parseDateInput(value: string): Date | null {
  const text = value.trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
  const yearFirst = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(text);
  const monthFirst = /^(\d{1,2})([-/ ])(\d{1,2})\2(\d{4}|\d{2})$/.exec(text);
  const namedMonthFirst = /^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)? (\d{4}|\d{2})$/.exec(text);
  const namedDayFirst = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)\.? (\d{4}|\d{2})$/.exec(text);
  let year: number;
  let month: number;
  let day: number;
  if (yearFirst) {
    year = Number(yearFirst[1]); month = Number(yearFirst[3]); day = Number(yearFirst[4]);
  } else if (monthFirst) {
    year = Number(monthFirst[4]); month = Number(monthFirst[1]); day = Number(monthFirst[3]);
    if (monthFirst[4].length === 2) year += 2000;
  } else if (namedMonthFirst || namedDayFirst) {
    const match = (namedMonthFirst ?? namedDayFirst)!;
    const name = namedMonthFirst ? match[1] : match[2];
    month = monthNames.findIndex((full) => name === full || name === full.slice(0, 3) || (full === 'september' && name === 'sept')) + 1;
    day = Number(namedMonthFirst ? match[2] : match[1]);
    year = Number(match[3]);
    if (match[3].length === 2) year += 2000;
  } else {
    return null;
  }
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Consistent, unambiguous display for a recognized date. */
export function formatDateInput(date: Date): string {
  return format(date, 'MMMM d, yyyy');
}

/** Human friendly label, e.g. "Mon, Jan 5". */
export function formatPretty(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'EEE, MMM d');
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}
