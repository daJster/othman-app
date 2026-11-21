import type { CalendarMonth } from '@/core/utils/calendar';
import {
  formatDayNumber,
  formatLongDate,
  formatMonthLabel,
  formatYear,
} from '../calendar-format';

/**
 * Calendar glyphs are a product rule: the grid always reads 1, 2, 3, 4 in
 * every language, while the words around them stay localized.
 */
const ARABIC_INDIC = /[٠-٩]/;

describe('meetings calendar numerals', () => {
  it('keeps day cells in Latin digits in Arabic', () => {
    expect(formatDayNumber(1, 'ar')).toBe('1');
    expect(formatDayNumber(14, 'ar')).toBe('14');
    expect(formatDayNumber(30, 'ar')).toBe('30');
  });

  it('keeps Gregorian and Hijri years in Latin digits', () => {
    expect(formatYear(1447, 'ar')).toBe('1447');

    const month: CalendarMonth = {
      system: 'gregorian',
      year: 2026,
      month: 4,
      days: [],
    };

    const label = formatMonthLabel(month, 'ar');
    expect(label).toContain('2026');
    expect(label).not.toMatch(ARABIC_INDIC);
  });

  it('keeps the selected-day line in Latin digits', () => {
    const label = formatLongDate(new Date(2026, 3, 2, 12), 'ar');

    expect(label).not.toMatch(ARABIC_INDIC);
    expect(label).toContain('2');
    expect(label).toContain('2026');
  });
});
