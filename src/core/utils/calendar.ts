/**
 * Month grid, shared by the Gregorian and Hijri views of the meetings
 * calendar.
 *
 * Always 42 cells (six weeks): a grid that grows to five or six rows depending
 * on the month makes the list below jump every time the user changes month.
 * Outside days are included so the first week is not blank, exactly like the
 * platform calendars.
 *
 * A cell keeps its **Gregorian** `Date` and `dateKey`; only the printed `day`
 * number and `inMonth` follow the active system. That is what makes selection
 * system-independent: switching the view never changes which day is selected
 * or which day's meetings are fetched.
 */

import type { DateKey } from '../types';
import { formatDateKey } from '../domain/meetings/date-key';
import {
  HIJRI_MAX_YEAR,
  HIJRI_MIN_YEAR,
  gregorianDateToHijri,
  hijriToGregorianDate,
  tryGregorianDateToHijri,
} from './hijri';

export const CALENDAR_WEEK_LENGTH = 7;
export const CALENDAR_GRID_LENGTH = 42;

export type CalendarSystem = 'gregorian' | 'hijri';

export type CalendarDay = {
  /** Local noon, so adding days never crosses a DST edge. */
  readonly date: Date;
  readonly dateKey: DateKey;
  /** Day number printed in the active system. */
  readonly day: number;
  /** Whether the cell belongs to the displayed (active-system) month. */
  readonly inMonth: boolean;
  readonly isToday: boolean;
};

export type CalendarMonth = {
  readonly system: CalendarSystem;
  /** Year in the active system. */
  readonly year: number;
  /** 1-based month in the active system. */
  readonly month: number;
  readonly days: readonly CalendarDay[];
};

function atNoon(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12,
    0,
    0,
    0,
  );
}

function makeDays(
  gridStart: Date,
  todayKey: DateKey,
  label: (date: Date) => { day: number; inMonth: boolean },
): CalendarDay[] {
  return Array.from({ length: CALENDAR_GRID_LENGTH }, (_, index) => {
    const date = addDays(gridStart, index);

    return {
      date,
      dateKey: formatDateKey(date),
      isToday: formatDateKey(date) === todayKey,
      ...label(date),
    };
  });
}

export function buildCalendarMonth(
  anchor: Date,
  system: CalendarSystem,
  today: Date = new Date(),
): CalendarMonth {
  const todayKey = formatDateKey(today);

  if (system === 'gregorian') {
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1;
    const first = atNoon(new Date(year, month - 1, 1));
    const gridStart = addDays(first, -first.getDay());

    return {
      system,
      year,
      month,
      days: makeDays(gridStart, todayKey, (date) => ({
        day: date.getDate(),
        inMonth: date.getFullYear() === year && date.getMonth() + 1 === month,
      })),
    };
  }

  const hijri = gregorianDateToHijri(anchor);
  const first = hijriToGregorianDate({
    year: hijri.year,
    month: hijri.month,
    day: 1,
  });
  const gridStart = addDays(first, -first.getDay());

  return {
    system,
    year: hijri.year,
    month: hijri.month,
    days: makeDays(gridStart, todayKey, (date) => {
      const cell = tryGregorianDateToHijri(date);

      // The grid can reach past the end of the conversion table at the very
      // edge of the supported range. Those cells are outside the month and
      // fall back to the Gregorian number rather than throwing a screen.
      if (!cell) return { day: date.getDate(), inMonth: false };

      return {
        day: cell.day,
        inMonth: cell.year === hijri.year && cell.month === hijri.month,
      };
    }),
  };
}

/** Whether `delta` months from `anchor` stays inside the supported range. */
export function canShiftCalendarMonth(
  anchor: Date,
  system: CalendarSystem,
  delta: number,
): boolean {
  if (system === 'gregorian') return true;

  const hijri = tryGregorianDateToHijri(anchor);
  if (!hijri) return false;

  const index = (hijri.year - HIJRI_MIN_YEAR) * 12 + (hijri.month - 1) + delta;

  return index >= 0 && index < (HIJRI_MAX_YEAR - HIJRI_MIN_YEAR + 1) * 12;
}

/**
 * Move the anchor by whole months in the active system.
 *
 * The returned date is the first of the target month at local noon. Hijri
 * shifts clamp to the supported range so a held-down arrow cannot throw.
 */
export function shiftCalendarMonth(
  anchor: Date,
  system: CalendarSystem,
  delta: number,
): Date {
  if (system === 'gregorian') {
    return atNoon(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1));
  }

  const hijri = gregorianDateToHijri(anchor);
  const months = (HIJRI_MAX_YEAR - HIJRI_MIN_YEAR + 1) * 12;
  const index = Math.min(
    Math.max((hijri.year - HIJRI_MIN_YEAR) * 12 + (hijri.month - 1) + delta, 0),
    months - 1,
  );

  return hijriToGregorianDate({
    year: HIJRI_MIN_YEAR + Math.floor(index / 12),
    month: (index % 12) + 1,
    day: 1,
  });
}
