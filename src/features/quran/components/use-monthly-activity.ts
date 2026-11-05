import { useMemo } from 'react';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { Language } from '@/i18n';
import type { ActivityDay } from './activity-grid';

/**
 * Seeded demo activity for the reading board.
 *
 * The board shows a Monthly (3-month) or Annual (year) span (Section 2 of the
 * Quran landing page). Real log data is not wired yet, so every day is filled from a PRNG seeded by its own date key: a
 * day renders the same value in every span and window that contains it, and
 * navigating away and back changes nothing. The return shape is the same
 * `ActivityDay[]` the real `readingLogStore` mapping will produce, so swapping
 * the source is replacing the builders, not rewriting the grid.
 *
 * Month grids are week-aligned GitHub-style: full weeks only, so leading cells
 * can belong to the previous month and trailing cells to the next one. Those
 * carry `outside: true` and are excluded from the span totals; days after
 * today always read zero so the future never looks active. The year grid is a
 * plain 365-day window — the catalog pads its first week.
 */

/** A calendar month. `month` is 0-based like `Date`. */
export type MonthKey = {
  year: number;
  month: number;
};

/** The three spans the segment control switches between. */
export type ActivitySpan = 'monthly' | 'annual';

/** How many months back the toggles reach, including the current one. */
export const MONTH_HISTORY = 12;

/** Year stops the Annual toggles visit: this year and the previous one. */
export const YEAR_HISTORY = 2;

export function currentMonthKey(now: Date = new Date()): MonthKey {
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function shiftMonthKey(key: MonthKey, delta: number): MonthKey {
  const total = key.year * 12 + key.month + delta;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;

  return { year, month };
}

/** `2026-11` style id, for tests and stable keys. */
export function monthKeyId(key: MonthKey): string {
  return `${key.year}-${String(key.month + 1).padStart(2, '0')}`;
}

/** Last calendar day of the month, at noon. */
export function endOfMonth(key: MonthKey): Date {
  return new Date(key.year, key.month + 1, 0, 12, 0, 0, 0);
}

/**
 * First day of the week column.
 *
 * Saturday for Arabic, Monday for English — the same split the reader's
 * calendar uses. Both are `date-fns` `WeekDay` values (Sunday = 0).
 */
export function weekStartFor(language: Language): 6 | 1 {
  return language === 'ar' ? 6 : 1;
}

/** Abbreviated month (`Sep` / `سبتمبر`) for heatmap month labels. */
export function formatMonthShort(day: string, language: Language): string {
  const [year, month] = day.split('-').map(Number);

  if (!year || !month) return '';

  return new Intl.DateTimeFormat(language, { month: 'short' }).format(
    new Date(year, month - 1, 1, 12),
  );
}

/** `12 Nov` / `12 نوفمبر` style label for tooltips and accessibility names. */
export function formatDayLabel(day: string, language: Language): string {
  const [year, month, date] = day.split('-').map(Number);

  if (!year || !month || !date) return day;

  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, date, 12));
}

/** Localized `November 2026` title for the single-month header. */
export function formatMonthTitle(key: MonthKey, language: Language): string {
  return new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(key.year, key.month, 1, 12));
}

/** Localized `Sep – Nov 2026` title for the three-month header. */
export function formatMonthRange(
  start: MonthKey,
  end: MonthKey,
  language: Language,
): string {
  const short = new Intl.DateTimeFormat(language, { month: 'short' });
  const long = new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
  });
  const startDate = new Date(start.year, start.month, 1, 12);

  if (start.year === end.year) {
    const endDate = new Date(end.year, end.month, 1, 12);

    return `${short.format(startDate)} – ${long.format(endDate)}`;
  }

  return `${long.format(startDate)} – ${long.format(new Date(end.year, end.month, 1, 12))}`;
}

/** Localized `2026` title for the annual header. */
export function formatYearTitle(key: MonthKey, language: Language): string {
  return new Intl.DateTimeFormat(language, { year: 'numeric' }).format(
    new Date(key.year, key.month, 1, 12),
  );
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashDay(day: string): number {
  let hash = 2166136261;

  for (let index = 0; index < day.length; index += 1) {
    hash ^= day.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function levelFromRoll(roll: number): ActivityDay['level'] {
  if (roll < 0.4) return 0;
  if (roll < 0.6) return 1;
  if (roll < 0.78) return 2;
  if (roll < 0.9) return 3;

  return 4;
}

/**
 * Plausible page counts per level (0, 1–2, 3–5, 6–9, 10+), matching the
 * catalog's count ramp so the demo scale survives the switch to real data.
 */
function countForLevel(level: ActivityDay['level'], jitter: number): number {
  switch (level) {
    case 0:
      return 0;
    case 1:
      return 1 + Math.floor(jitter * 2);
    case 2:
      return 3 + Math.floor(jitter * 3);
    case 3:
      return 6 + Math.floor(jitter * 4);
    case 4:
      return 10 + Math.floor(jitter * 3);
  }
}

/** The demo value of one day, stable in every span that contains it. */
function dayActivity(day: string): Pick<ActivityDay, 'count' | 'level'> {
  const random = mulberry32(hashDay(day));
  const level = levelFromRoll(random());

  return { count: countForLevel(level, random()), level };
}

function atNoon(date: Date): Date {
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);

  return noon;
}

/**
 * Every visible cell for the months from `start` (inclusive) spanning `count`
 * months, oldest first, padded to full weeks.
 *
 * Always a multiple of 7. A day's value comes from its own date hash, so it
 * never shifts between spans; only its future/past state changes as time
 * passes, because days after today read zero.
 */
export function buildSpanCells(
  start: MonthKey,
  count: number,
  weekStart: number,
  now: Date = new Date(),
): ActivityDay[] {
  const first = new Date(start.year, start.month, 1, 12);
  const lastMonth = shiftMonthKey(start, count - 1);
  const last = endOfMonth(lastMonth);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const trail = (weekStart + 6 - last.getDay() + 7) % 7;
  const gridStart = new Date(start.year, start.month, 1 - lead, 12, 0, 0, 0);
  const total =
    Math.round(
      (atNoon(last).getTime() - atNoon(gridStart).getTime()) / 86_400_000,
    ) +
    1 +
    trail;
  const today = atNoon(now);

  return Array.from({ length: total }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
      12,
      0,
      0,
      0,
    );
    const day = formatDateKey(date);
    const outside = !isInSpan(date, start, count);
    const future = date.getTime() > today.getTime();
    const { count: demoCount, level: demoLevel } = dayActivity(day);

    return {
      day,
      count: future ? 0 : demoCount,
      level: future ? 0 : demoLevel,
      ...(outside ? { outside: true } : null),
    };
  });
}

function isInSpan(date: Date, start: MonthKey, count: number): boolean {
  const index =
    (date.getFullYear() - start.year) * 12 + date.getMonth() - start.month;

  return index >= 0 && index < count;
}

/**
 * Every visible cell for one month, oldest first, padded to full weeks.
 *
 * Always a multiple of 7 (28, 35 or 42 cells).
 */
export function buildMonthCells(
  key: MonthKey,
  weekStart: number,
  now: Date = new Date(),
): ActivityDay[] {
  return buildSpanCells(key, 1, weekStart, now);
}

/**
 * The 365 days ending on `end` (inclusive), oldest first.
 *
 * The catalog pads the first week to `weekStart`; days after today read zero.
 */
export function buildYearCells(
  end: Date,
  now: Date = new Date(),
): ActivityDay[] {
  const last = atNoon(end);
  const today = atNoon(now);

  return Array.from({ length: 365 }, (_, index) => {
    const date = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate() - (365 - 1 - index),
      12,
      0,
      0,
      0,
    );
    const day = formatDateKey(date);
    const future = date.getTime() > today.getTime();
    const { count: demoCount, level: demoLevel } = dayActivity(day);

    return {
      day,
      count: future ? 0 : demoCount,
      level: future ? 0 : demoLevel,
    };
  });
}

export type SpanActivity = {
  days: ActivityDay[];
  /** Week columns; month grids always satisfy `days.length === columns * 7`. */
  columns: number;
  weekStart: 6 | 1;
};

/** Seeded span grid for the band; stable across renders for one window. */
export function useSpanActivity(
  span: ActivitySpan,
  end: MonthKey,
  language: Language,
): SpanActivity {
  const { year, month } = end;

  return useMemo(() => {
    const weekStart = weekStartFor(language);
    const key = { year, month };

    if (span === 'annual') {
      const days = buildYearCells(endOfMonth(key));

      return { days, columns: 53, weekStart };
    }

    const start = shiftMonthKey(key, -2);
    const days = buildSpanCells(start, 3, weekStart);

    return { days, columns: days.length / 7, weekStart };
  }, [language, month, span, year]);
}

export type MonthlyActivity = SpanActivity;

/** Single-month grid for callers that need one month outside the band. */
export function useMonthlyActivity(
  key: MonthKey,
  language: Language,
): MonthlyActivity {
  const { year, month } = key;

  return useMemo(() => {
    const weekStart = weekStartFor(language);
    const days = buildMonthCells({ year, month }, weekStart);

    return { days, columns: days.length / 7, weekStart };
  }, [language, month, year]);
}
