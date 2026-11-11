import type { DateKey, Meeting } from '@/core/types';

/**
 * Where a day's meetings come from.
 *
 * Today that is the mock JSON; the Firestore implementation drops in behind the
 * same interface without touching the screen or the cache.
 *
 * `listByRange` exists for the calendar's density marks: a month grid has to
 * know which days hold a session before the day is opened, and reading 42 days
 * one by one to draw a few dots would be 42 reads for no extra information.
 */
export interface MeetingsRepository {
  listByDate(dateKey: DateKey): Promise<Meeting[]>;
  listByRange(from: DateKey, to: DateKey): Promise<Meeting[]>;
}

export interface MeetingsService {
  /** Cache-first; one network read per day per app session. */
  listByDate(dateKey: DateKey): Promise<Meeting[]>;
  /** Every meeting between two day keys, inclusive. */
  listByRange(from: DateKey, to: DateKey): Promise<Meeting[]>;
  /** Drop every cached day (pull-to-refresh, sign-out). */
  invalidate(): void;
}
