import {
  CALENDAR_GRID_LENGTH,
  buildCalendarMonth,
  canShiftCalendarMonth,
  shiftCalendarMonth,
} from '@/core/utils/calendar';
import { gregorianDateToHijri, hijriToGregorianDate } from '@/core/utils/hijri';

const TODAY = new Date(2026, 9, 28, 12);

describe('buildCalendarMonth (Gregorian)', () => {
  it('always renders six weeks starting on Sunday', () => {
    const month = buildCalendarMonth(new Date(2026, 3, 2, 12), 'gregorian');

    expect(month.system).toBe('gregorian');
    expect(month.year).toBe(2026);
    expect(month.month).toBe(4);
    expect(month.days).toHaveLength(CALENDAR_GRID_LENGTH);

    // 1 April 2026 is a Wednesday, so the grid opens on Sunday 29 March.
    expect(month.days[0].date.getDay()).toBe(0);
    expect(month.days[0].dateKey).toBe('2026-03-29');
    expect(month.days[3].dateKey).toBe('2026-04-01');
    expect(month.days[3].inMonth).toBe(true);
    expect(month.days[0].inMonth).toBe(false);
  });

  it('uses consecutive days with no duplicates', () => {
    const month = buildCalendarMonth(new Date(2026, 3, 2, 12), 'gregorian');
    const keys = month.days.map((day) => day.dateKey);

    expect(new Set(keys).size).toBe(CALENDAR_GRID_LENGTH);
    // Same date parts as the previous cell plus one day; comparing epochs
    // would fail in a zone whose DST switch falls inside the grid.
    for (let index = 1; index < month.days.length; index++) {
      const previous = month.days[index - 1].date;
      const current = month.days[index].date;
      const expected = new Date(
        previous.getFullYear(),
        previous.getMonth(),
        previous.getDate() + 1,
      );

      expect(current.getFullYear()).toBe(expected.getFullYear());
      expect(current.getMonth()).toBe(expected.getMonth());
      expect(current.getDate()).toBe(expected.getDate());
    }
  });

  it('marks today from the local calendar day', () => {
    const month = buildCalendarMonth(
      new Date(2026, 9, 1, 12),
      'gregorian',
      TODAY,
    );
    const today = month.days.find((day) => day.isToday);

    expect(today?.dateKey).toBe('2026-10-28');
    expect(month.days.filter((day) => day.isToday)).toHaveLength(1);
  });
});

describe('buildCalendarMonth (Hijri)', () => {
  it('labels cells with the Hijri day and month', () => {
    const anchor = new Date(2026, 3, 2, 12);
    const hijri = gregorianDateToHijri(anchor);
    const month = buildCalendarMonth(anchor, 'hijri');

    expect(hijri).toEqual({ year: 1447, month: 10, day: 14 });
    expect(month.system).toBe('hijri');
    expect(month.year).toBe(1447);
    expect(month.month).toBe(10);
    expect(month.days).toHaveLength(CALENDAR_GRID_LENGTH);

    const firstOfMonth = month.days.find((day) => day.inMonth && day.day === 1);

    expect(firstOfMonth?.dateKey).toBe('2026-03-20');
    expect(month.days.find((day) => day.dateKey === '2026-04-02')?.day).toBe(
      14,
    );
  });

  it('keeps the Gregorian date as the canonical value', () => {
    const gregorian = buildCalendarMonth(new Date(2026, 3, 2, 12), 'gregorian');
    const hijri = buildCalendarMonth(new Date(2026, 3, 2, 12), 'hijri');

    // The same Gregorian day carries a different printed number in each view…
    expect(hijri.days.find((day) => day.dateKey === '2026-04-02')?.day).toBe(
      14,
    );
    expect(
      gregorian.days.find((day) => day.dateKey === '2026-04-02')?.day,
    ).toBe(2);

    // …and every cell is still a real `YYYY-MM-DD` key a query can use.
    for (const day of hijri.days) {
      expect(day.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('shiftCalendarMonth', () => {
  it('crosses the Gregorian year boundary', () => {
    const next = shiftCalendarMonth(new Date(2026, 11, 15, 12), 'gregorian', 1);

    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(1);
  });

  it('crosses the Hijri year boundary', () => {
    const anchor = hijriToGregorianDate({ year: 1447, month: 12, day: 10 });
    const next = shiftCalendarMonth(anchor, 'hijri', 1);

    expect(gregorianDateToHijri(next)).toEqual({
      year: 1448,
      month: 1,
      day: 1,
    });
  });

  it('clamps at the ends of the Hijri table', () => {
    const first = hijriToGregorianDate({ year: 1395, month: 1, day: 10 });
    const last = hijriToGregorianDate({ year: 1510, month: 12, day: 10 });

    expect(canShiftCalendarMonth(first, 'hijri', -1)).toBe(false);
    expect(canShiftCalendarMonth(first, 'hijri', 1)).toBe(true);
    expect(canShiftCalendarMonth(last, 'hijri', 1)).toBe(false);

    expect(
      gregorianDateToHijri(shiftCalendarMonth(first, 'hijri', -1)),
    ).toEqual({ year: 1395, month: 1, day: 1 });
  });

  it('never limits the Gregorian view', () => {
    expect(
      canShiftCalendarMonth(new Date(1900, 0, 1, 12), 'gregorian', -1),
    ).toBe(true);
  });
});
