import { formatDateKey } from '@/core/domain/meetings/date-key';

/**
 * The day's practice: the four gauges on the resume band.
 *
 * **The day turns over at 02:00, not midnight.** Reading after Isha is normal in
 * this audience and a 00:00 reset would wipe a session that began before the
 * night ended. `practiceDayKey` shifts the clock back two hours before taking
 * the calendar key, so 01:59 still belongs to the day that is ending and 02:00
 * starts a clean one. The key is local time, which means the reset follows the
 * device's timezone rather than the server's.
 *
 * Salah is a count (0–5, one per prayer), duaa a count (0–3, one per duaa read)
 * and nafila 0 or 1. `pages` mirrors the reading log's daily goal (0 or 1) and
 * is stored here so the activity calendar can colour a past day without
 * reloading the reader's history.
 */
export const SALAH_TARGET = 5;
export const DUAA_TARGET = 3;
export const DUAA_MAX = 30;
/** One night prayer fills the gauge; the day can record up to 30. */
export const NAFILA_TARGET = 1;
export const NAFILA_MAX = 30;
export const PAGES_TARGET = 1;

/** The hour at which the practice day rolls over, local time. */
export const PRACTICE_RESET_HOUR = 2;

export const SALAH_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type SalahName = (typeof SALAH_NAMES)[number];

export type PracticeEntry = {
  /** Local practice day, `YYYY-MM-DD`, already shifted past 02:00. */
  day: string;
  /** Prayers performed today, 0–5. */
  salah: number;
  /** Duaas completed today, 0–3. */
  duaa: number;
  /** Night prayer performed, 0 or 1. */
  nafila: number;
  /** Whether the day's reading goal was met, 0 or 1. */
  pages: number;
};

export const EMPTY_PRACTICE: Omit<PracticeEntry, 'day'> = {
  salah: 0,
  duaa: 0,
  nafila: 0,
  pages: 0,
};

/** The practice day a moment belongs to. */
export function practiceDayKey(now: Date = new Date()): string {
  const shifted = new Date(now);

  if (shifted.getHours() < PRACTICE_RESET_HOUR) {
    shifted.setDate(shifted.getDate() - 1);
  }

  return formatDateKey(shifted);
}

/** The same shift, kept as a `Date` for callers that need a calendar day. */
export function practiceDay(now: Date = new Date()): Date {
  const shifted = new Date(now);

  if (shifted.getHours() < PRACTICE_RESET_HOUR) {
    shifted.setDate(shifted.getDate() - 1);
  }

  shifted.setHours(12, 0, 0, 0);

  return shifted;
}

/** A gauge is complete when it has reached its own target. */
export function isSalahDone(entry: PracticeEntry): boolean {
  return entry.salah >= SALAH_TARGET;
}

export function isDuaaDone(entry: PracticeEntry): boolean {
  return entry.duaa >= DUAA_TARGET;
}

export function isNafilaDone(entry: PracticeEntry): boolean {
  return entry.nafila >= NAFILA_TARGET;
}

export function isPagesDone(entry: PracticeEntry): boolean {
  return entry.pages >= PAGES_TARGET;
}

/** All four gauges full: the day is golden. */
export function isGoldenDay(entry: PracticeEntry): boolean {
  return (
    isSalahDone(entry) &&
    isDuaaDone(entry) &&
    isNafilaDone(entry) &&
    isPagesDone(entry)
  );
}

/** Clamp a stored value to its gauge's range. */
export function clampPractice(
  values: Partial<Omit<PracticeEntry, 'day'>>,
): Omit<PracticeEntry, 'day'> {
  const bound = (value: unknown, max: number) =>
    Number.isFinite(value)
      ? Math.min(max, Math.max(0, Math.round(Number(value))))
      : 0;

  return {
    salah: bound(values.salah, SALAH_TARGET),
    duaa: bound(values.duaa, DUAA_MAX),
    nafila: bound(values.nafila, NAFILA_MAX),
    pages: bound(values.pages, PAGES_TARGET),
  };
}
