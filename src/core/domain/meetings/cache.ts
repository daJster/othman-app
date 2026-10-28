import type { DateKey, Meeting } from '../../types';

const MAX_CACHE_SIZE = 24;

/**
 * Bounded FIFO cache: a day's meetings, keyed by `YYYY-MM-DD`.
 *
 * 24 entries is roughly a month of browsing around the calendar. Re-setting an
 * existing key keeps its original position (a refresh is not a use), which is
 * fine here — eviction only has to be bounded and predictable, not LRU-perfect.
 */
export const meetingsCache = new Map<DateKey, Meeting[]>();

export function getMeetingsFromCache(dateKey: DateKey): Meeting[] | undefined {
  return meetingsCache.get(dateKey);
}

export function setMeetingsCache(dateKey: DateKey, meetings: Meeting[]): void {
  if (meetingsCache.has(dateKey)) {
    meetingsCache.set(dateKey, meetings);
    return;
  }

  if (meetingsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = meetingsCache.keys().next().value;
    if (oldestKey !== undefined) {
      meetingsCache.delete(oldestKey);
    }
  }

  meetingsCache.set(dateKey, meetings);
}

export function clearMeetingsCache(): void {
  meetingsCache.clear();
}

export const MEETINGS_CACHE_MAX_SIZE = MAX_CACHE_SIZE;
