/**
 * A local reading log.
 *
 * The reader is the only writer; the landing page's resume card, previous-readings
 * list and daily hizb gauge are the readers. One entry per day is enough for all
 * of them to agree on "what did this person read, and when":
 *
 *  - resume: the newest entry;
 *  - previous readings: the entries after it;
 *  - the daily hizb: the distinct pages in that day's `readPages`.
 *
 * The log is deliberately small and local. It is never synced, and both caps
 * exist to keep a web `localStorage` write cheap.
 */

/** Keep a year plus a day; the activity board draws the last 365 days. */
export const MAX_READING_DAYS = 366;

/** A day with more than a juz of distinct pages is already an outlier. */
export const MAX_PAGES_PER_DAY = 40;

export type ReadingEntry = {
  /** Local calendar day, `YYYY-MM-DD`. */
  day: string;
  /** Page of the last position written that day. */
  page: number;
  /** Surah that page starts with, 1–114. */
  surah: number;
  /** Ayah selected on that page, or `null` if none was. */
  ayahKey: string | null;
  /** Edition the reader was using, or `null` if it was not attached yet. */
  editionKey: string | null;
  /** Epoch millis of the last time this position was written. */
  at: number;
  /** Distinct pages visited that day, oldest first, capped at 40. */
  readPages: number[];
};

export type HizbProgress = {
  /** Distinct pages read that day, clamped to `target`. */
  read: number;
  /** The goal the gauge is drawn against. */
  target: number;
  /** `read >= target`; a zero-page goal is trivially done. */
  done: boolean;
};

function uniquePages(pages: readonly number[]): number[] {
  return Array.from(new Set(pages)).slice(0, MAX_PAGES_PER_DAY);
}

/**
 * Add a position to the log.
 *
 * There is one entry per day, so a later position *replaces* the day's resume
 * fields while its `readPages` accumulate. New days go to the front, which makes
 * the array its own newest-first ordering. The oldest day falls off at 366.
 */
export function appendReading(
  log: readonly ReadingEntry[],
  next: ReadingEntry,
): ReadingEntry[] {
  const existing = log.find((entry) => entry.day === next.day);
  const entry: ReadingEntry = {
    ...next,
    readPages: uniquePages([
      ...(existing?.readPages ?? []),
      ...next.readPages,
      next.page,
    ]),
  };

  return [entry, ...log.filter((item) => item.day !== next.day)].slice(
    0,
    MAX_READING_DAYS,
  );
}

/** The position the resume card should offer, or `null` for a brand-new user. */
export function resumeEntry(log: readonly ReadingEntry[]): ReadingEntry | null {
  return log[0] ?? null;
}

/** The readings before the resume, newest first. */
export function previousEntries(
  log: readonly ReadingEntry[],
  max = 3,
): ReadingEntry[] {
  if (max <= 0) return [];

  return log.slice(1, 1 + Math.floor(max));
}

/**
 * Distinct pages logged for a day.
 *
 * There is one entry per day, so the count comes from that entry's
 * `readPages` rather than from the number of entries (which is always 1).
 */
export function pagesOn(log: readonly ReadingEntry[], day: string): number {
  const entry = log.find((item) => item.day === day);

  return entry ? new Set(entry.readPages).size : 0;
}

/**
 * The day's hizb gauge.
 *
 * `read` is clamped so a reader who finishes 12 pages against a 10-page goal
 * sees `10/10`, not a bar past its track. `done` is computed from the clamped
 * value, which makes exactly 10 pages count as complete.
 */
export function hizbProgress(
  log: readonly ReadingEntry[],
  day: string,
  targetPages: number,
): HizbProgress {
  const target = Math.max(0, targetPages);
  const read = Math.min(pagesOn(log, day), target);

  return { read, target, done: read >= target };
}
