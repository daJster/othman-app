import type { DateKey, Meeting } from '@/core/types';

/**
 * Where a day's meetings come from.
 *
 * Today that is the mock JSON; the Firestore implementation drops in behind the
 * same interface without touching the screen or the cache.
 */
export interface MeetingsRepository {
  listByDate(dateKey: DateKey): Promise<Meeting[]>;
}

export interface MeetingsService {
  /** Cache-first; one network read per day per app session. */
  listByDate(dateKey: DateKey): Promise<Meeting[]>;
  /** Drop every cached day (pull-to-refresh, sign-out). */
  invalidate(): void;
}
