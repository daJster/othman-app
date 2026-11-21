import {
  formatClockTime as formatMeetingClock,
  formatCount as formatMeetingCount,
  formatDayNumber,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  formatYear,
} from '@/features/meetings/calendar-format';
import type { CalendarMonth } from '@/core/utils/calendar';
import {
  formatActivityDay,
  formatNumber,
  formatPercent,
  formatReviewedDate,
  formatShortDay,
  formatWeekdayShort,
} from '@/features/progress/progress-format';
import { formatReaderNumber } from '@/features/quran/format';
import { ayahReference } from '@/features/quran/records/records-format';
import {
  formatCount as formatCircleCount,
  formatTime as formatCircleTime,
} from '@/features/home/circle-format';
import { numberLocale } from '../format';

/**
 * One app-wide rule: every number the app prints uses the plain `0–9` glyphs,
 * in Arabic and English alike. Words, month names and meridiem stay localized;
 * only the digits are pinned, because a bare `ar` locale resolves to
 * Arabic-Indic digits on many devices.
 */
const ARABIC_INDIC = /[٠-٩۰-۹]/;

const gregorianMonth: CalendarMonth = {
  system: 'gregorian',
  year: 2026,
  month: 11,
  days: [],
};

const hijriMonth: CalendarMonth = {
  system: 'hijri',
  year: 1447,
  month: 10,
  days: [],
};

const samples = (): string[] => [
  numberLocale('ar'),
  formatDayNumber(1, 'ar'),
  formatDayNumber(30, 'ar'),
  formatYear(1447, 'ar'),
  formatMonthLabel(gregorianMonth, 'ar'),
  formatMonthLabel(hijriMonth, 'ar'),
  formatLongDate(new Date(2026, 10, 10, 12), 'ar'),
  formatMeetingClock('18:05', 'ar'),
  formatMeetingCount(45, 'ar'),
  formatShortDate(new Date(2026, 10, 10, 12), 'ar'),
  formatPercent(72, 'ar'),
  formatNumber(604, 'ar'),
  formatReviewedDate('2026-11-10', 'ar'),
  formatWeekdayShort(new Date(2026, 10, 10, 12), 'ar'),
  formatShortDay(new Date(2026, 10, 10, 12), 'ar'),
  formatActivityDay('2026-11-10', 'ar'),
  formatReaderNumber(255, 'ar'),
  ayahReference('البقرة', 255, 'ar'),
  formatCircleCount(18, 'ar'),
  formatCircleTime('18:30', 'ar') ?? '',
];

describe('app numeric digits', () => {
  it('keeps every Arabic formatter on Latin digits', () => {
    for (const sample of samples()) {
      expect(sample).not.toMatch(ARABIC_INDIC);
    }
  });

  it('keeps the expected Latin numbers in place', () => {
    expect(formatDayNumber(30, 'ar')).toBe('30');
    expect(formatYear(1447, 'ar')).toBe('1447');
    expect(formatMonthLabel(hijriMonth, 'ar')).toContain('1447');
    expect(formatLongDate(new Date(2026, 10, 10, 12), 'ar')).toContain('2026');
    expect(formatMeetingClock('18:05', 'ar')).toContain('6:05');
    expect(formatPercent(72, 'ar')).toContain('72');
    expect(ayahReference('البقرة', 255, 'ar')).toContain('255');
  });
});
