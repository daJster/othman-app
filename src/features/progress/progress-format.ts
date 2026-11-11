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

/** `Sat` / `السبت` for the week strip. */
export function formatWeekdayShort(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(date);
}

/** `12 Oct` / `١٢ أكتوبر` for the week strip caption. */
export function formatShortDay(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/** `12 Oct 2026` in the reader's locale, used by the activity rows. */
export function formatActivityDay(
  dateKey: DateKey,
  language: Language,
): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
  }).format(parseDateKey(dateKey));
}

/**
 * Arabic-Indic digits typed into the search field become ASCII digits before
 * comparison. Without this, a reader with an Arabic keyboard searching "١١٢"
 * gets no result for surah 112.
 */
export function normalizeSearchDigits(value: string): string {
  return value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => {
    const code = digit.charCodeAt(0);

    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}
