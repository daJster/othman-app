import { formatDateKey, parseDateKey } from '@/core/domain/meetings/date-key';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import type { DateKey } from '@/core/types';
import { weekStartFor } from '@/features/quran/components/use-monthly-activity';
import type { Language } from '@/i18n';

/**
 * Review activity derived from the progress rows.
 *
 * The progress screen only stores one number per surah — the percentage
 * memorised and the day it was last revised. That is enough to answer the two
 * questions the new surfaces ask: "how did the latest week look?" and "is my
 * review rhythm steady?" Both are counts of surahs reviewed on a day or in a
 * week, never a page count. A page count would need the reader's log and would
 * quietly disagree with the heatmap when the two sources drift.
 *
 * The anchor is the most recent review *in the data*, not `new Date()`: the
 * demo fixture is deliberately fixed (see `demo-progress.repository.ts`), and a
 * strip that reads "this week" while showing a week from October would be a
 * lie. When real data arrives it ends today, and the label follows it.
 */

export type ReviewDay = {
  day: DateKey;
  date: Date;
  /** Surahs whose `lastReviewed` falls on this day. */
  count: number;
  /** 0–4, matching the heatmap's five-step ramp. */
  level: 0 | 1 | 2 | 3 | 4;
};

export type ReviewWeek = {
  /** First day of the week (local Saturday or Monday). */
  start: DateKey;
  /** Inclusive last day of the week. */
  end: DateKey;
  /** Label anchor: the middle of the week, used for the axis. */
  anchor: DateKey;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

function atNoon(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);

  return copy;
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

function startOfWeek(date: Date, weekStart: number): Date {
  const noon = atNoon(date);
  const offset = (noon.getDay() - weekStart + 7) % 7;

  return addDays(noon, -offset);
}

function dayKeyOf(date: Date): DateKey {
  return formatDateKey(date);
}

/** The most recent `lastReviewed` in the rows, or `null` when none exist. */
export function latestReviewDate(rows: readonly SurahProgress[]): Date | null {
  let latest: Date | null = null;

  for (const row of rows) {
    if (!row.lastReviewed) continue;

    const parsed = parseDateKey(row.lastReviewed);
    if (!latest || parsed.getTime() > latest.getTime()) latest = parsed;
  }

  return latest;
}

function countsByDay(rows: readonly SurahProgress[]): Map<DateKey, number> {
  const counts = new Map<DateKey, number>();

  for (const row of rows) {
    if (!row.lastReviewed) continue;
    counts.set(row.lastReviewed, (counts.get(row.lastReviewed) ?? 0) + 1);
  }

  return counts;
}

/**
 * A five-step ramp. The thresholds are proportional, so a week with one review
 * and a week with forty both read as a ramp rather than a flat block. The
 * absolute counts are still spoken by the accessibility label.
 */
function levelFor(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;

  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;

  return 4;
}

/**
 * The week that contains the latest review.
 *
 * Arabic weeks start on Saturday and English weeks on Monday, matching the
 * reader's calendar and the Quran landing board. The strip therefore renders
 * the same seven days in both languages, only in a different order — the app's
 * physical layout does not mirror.
 */
export function reviewDaysForWeek(
  rows: readonly SurahProgress[],
  language: Language,
  anchor: Date | null = latestReviewDate(rows),
): ReviewDay[] {
  const end = anchor ?? new Date();
  const start = startOfWeek(end, weekStartFor(language));
  const counts = countsByDay(rows);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const max = Math.max(0, ...days.map((day) => counts.get(dayKeyOf(day)) ?? 0));

  return days.map((date) => {
    const day = dayKeyOf(date);
    const count = counts.get(day) ?? 0;

    return { day, date, count, level: levelFor(count, max) };
  });
}

/**
 * Weekly review counts, oldest first.
 *
 * The current week is the one containing the latest review. Weeks before the
 * first recorded review are included and read zero; that is honest about a
 * short history rather than pretending the chart starts when the user did.
 */
export function reviewTrend(
  rows: readonly SurahProgress[],
  language: Language,
  weeks = 8,
  anchor: Date | null = latestReviewDate(rows),
): ReviewWeek[] {
  const safeWeeks = Math.max(1, Math.floor(weeks));
  const end = startOfWeek(anchor ?? new Date(), weekStartFor(language));
  const counts = new Map<DateKey, number>();

  for (const row of rows) {
    if (!row.lastReviewed) continue;
    const week = dayKeyOf(
      startOfWeek(parseDateKey(row.lastReviewed), weekStartFor(language)),
    );
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }

  const starts = Array.from({ length: safeWeeks }, (_, index) =>
    addDays(end, -(safeWeeks - 1 - index) * 7),
  );
  const max = Math.max(
    0,
    ...starts.map((start) => counts.get(dayKeyOf(start)) ?? 0),
  );

  return starts.map((start) => {
    const startKey = dayKeyOf(start);
    const count = counts.get(startKey) ?? 0;

    return {
      start: startKey,
      end: dayKeyOf(addDays(start, 6)),
      anchor: dayKeyOf(addDays(start, 3)),
      count,
      level: levelFor(count, max),
    };
  });
}

/** Surahs with a review date, most recent first. */
export function recentReviews(
  rows: readonly SurahProgress[],
  limit = 5,
): SurahProgress[] {
  return rows
    .filter((row) => row.lastReviewed !== null)
    .slice()
    .sort((a, b) => (b.lastReviewed ?? '').localeCompare(a.lastReviewed ?? ''))
    .slice(0, Math.max(0, limit));
}

/** Total reviews in a set of days. */
export function totalReviews(days: readonly ReviewDay[]): number {
  return days.reduce((sum, day) => sum + day.count, 0);
}
