import { parseDateKey } from '@/core/domain/meetings/date-key';
import type { DateKey } from '@/core/types';
import type { Language } from '@/i18n';

/**
 * Labels for the progress screen.
 *
 * Numbers and dates go through `Intl` so Arabic gets its own digits and month
 * names. The percent sign is produced by `style: 'percent'` rather than appended
 * with `+ '%'`: Arabic writes it before the number, and the formatter is the
 * only thing that knows that.
 */

export function formatPercent(percent: number, language: Language): string {
  return new Intl.NumberFormat(language, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(percent / 100);
}

/** Surah numbers and counts share the same formatter. */
export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(language).format(value);
}

/** Short review date — a weekday and year are noise in a detail sheet. */
export function formatReviewedDate(
  dateKey: DateKey,
  language: Language,
): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseDateKey(dateKey));
}
