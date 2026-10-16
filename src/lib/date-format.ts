import { FRENCH_DAYS, weekdayIndex, type Ymd } from '@/lib/date-utils';

const toUtcDate = (ymd: Ymd) => new Date(`${ymd}T00:00:00.000Z`);

/** « 12 juil. » */
export function formatDayMonth(ymd: Ymd): string {
  return toUtcDate(ymd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** « juil. » */
export function formatMonthShort(ymd: Ymd): string {
  return toUtcDate(ymd).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' });
}

/** « Du 6 juil. au 12 juil. 2026 » */
export function formatDateRange(start: Ymd, end: Ymd): string {
  const endFormatted = toUtcDate(end).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `Du ${formatDayMonth(start)} au ${endFormatted}`;
}

/** « Lundi » */
export const weekdayLabel = (ymd: Ymd): string => FRENCH_DAYS[weekdayIndex(ymd)];
