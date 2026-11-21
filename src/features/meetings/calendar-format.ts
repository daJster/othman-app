import type { CalendarMonth } from '@/core/utils/calendar';
import type { Language } from '@/i18n';
import { numberLocale } from '@/i18n';

/**
 * Date labels for the meetings calendar.
 *
 * Gregorian labels go through `Intl` so they match the device's regional
 * conventions (an Egyptian and a Gulf user do not spell October the same way).
 * Hijri month names are a table: Arabic Hijri month names are stable across
 * regions, and not every Hermes build bundles the `islamic-umalqura` calendar
 * for formatting — the conversion itself already comes from `core/utils/hijri`.
 *
 * Weekday headers start on Sunday for both languages, matching the calendars
 * users see in the region. The grid is laid out with `flex-row`, so RTL
 * reverses it visually without touching this order.
 */

const HIJRI_MONTH_NAMES: Readonly<Record<Language, readonly string[]>> = {
  ar: [
    'محرم',
    'صفر',
    'ربيع الأول',
    'ربيع الآخر',
    'جمادى الأولى',
    'جمادى الآخرة',
    'رجب',
    'شعبان',
    'رمضان',
    'شوال',
    'ذو القعدة',
    'ذو الحجة',
  ],
  en: [
    'Muharram',
    'Safar',
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    'Jumada al-Ula',
    'Jumada al-Akhirah',
    'Rajab',
    "Sha'ban",
    'Ramadan',
    'Shawwal',
    "Dhu al-Qi'dah",
    'Dhu al-Hijjah',
  ],
};

const WEEKDAY_CACHE = new Map<Language, readonly string[]>();

/** Narrow weekday labels, Sunday first. */
export function weekdayLabels(language: Language): readonly string[] {
  const cached = WEEKDAY_CACHE.get(language);
  if (cached) return cached;

  const labels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(numberLocale(language), {
      weekday: 'narrow',
    }).format(
      // 7 January 2024 is a Sunday; any Sunday would do.
      new Date(2024, 0, 7 + index, 12),
    ),
  );

  WEEKDAY_CACHE.set(language, labels);
  return labels;
}

export function formatDayNumber(day: number, language: Language): string {
  return new Intl.NumberFormat(numberLocale(language)).format(day);
}

/**
 * A year, in the locale's digits but never grouped.
 *
 * `Intl.NumberFormat` renders 1447 as "1,447", which is not how a Hijri year is
 * written; days are ≤ 31 and unaffected either way.
 */
export function formatYear(year: number, language: Language): string {
  return new Intl.NumberFormat(numberLocale(language), {
    useGrouping: false,
  }).format(year);
}

/** `April 2026` or `Shawwal 1447`, in the active system. */
export function formatMonthLabel(
  month: CalendarMonth,
  language: Language,
): string {
  if (month.system === 'gregorian') {
    return new Intl.DateTimeFormat(numberLocale(language), {
      month: 'long',
      year: 'numeric',
    }).format(new Date(month.year, month.month - 1, 1, 12));
  }

  return `${HIJRI_MONTH_NAMES[language][month.month - 1]} ${formatYear(
    month.year,
    language,
  )}`;
}

/** Long date for the selected-day line and for each cell's accessible name. */
export function formatLongDate(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(numberLocale(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * `18:00` → the language's clock reading.
 *
 * The fixture stores a 24-hour clock because a display string ("2:00 PM")
 * cannot be re-rendered in Arabic digits or with an Arabic meridiem. The
 * anchor date is arbitrary; only the time of day is formatted.
 */
export function formatClockTime(time: string, language: Language): string {
  const [hours, minutes] = time.split(':').map(Number);

  return new Intl.DateTimeFormat(numberLocale(language), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(
    new Date(
      2000,
      0,
      1,
      Number.isFinite(hours) ? hours : 0,
      Number.isFinite(minutes) ? minutes : 0,
    ),
  );
}

/** Digits in the active locale, without grouping (durations, counts). */
export function formatCount(value: number, language: Language): string {
  return new Intl.NumberFormat(numberLocale(language), {
    useGrouping: false,
  }).format(value);
}

/**
 * A compact day for a one-line affordance: `Tue, 10 Nov` / `الثلاثاء، 10 نوفمبر`.
 *
 * The empty state needs to name the next session without spending a whole line
 * on a year the reader already knows.
 */
export function formatShortDate(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(numberLocale(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/**
 * A short date and a clock reading on one line, for the dialog's start/end
 * pair: `Sat, 21 Nov · 9:00 PM` / `السبت، 21 نوفمبر · 9:00 م`.
 */
export function formatDateTime(date: Date, language: Language): string {
  const time = new Intl.DateTimeFormat(numberLocale(language), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return `${formatShortDate(date, language)} · ${time}`;
}
