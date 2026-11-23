import { clearMeetingsCache } from '@/core/domain/meetings/cache';
import { fetchMeetingsForDate } from '@/core/domain/meetings/repository';
import type { DateKey, Meeting } from '@/core/types';
import type { RequestOptions } from '@/platform/http';
import type { MeetingsRepository, MeetingsService } from './meetings.types';

/**
 * Wires the cache-first domain reader to a concrete repository.
 *
 * `core` owns *when* a day is fetched and cached; this layer only decides
 * *where* it comes from. A failed or cancelled read is never cached, because
 * the cache is written only after the repository resolves.
 *
 * Ranges are cached here rather than in `core`: a range is a calendar-view
 * concern (one call per visible window), not a domain fact, and a per-day cache
 * keyed by a span would duplicate the day cache it is built from.
 */
export function createMeetingsService(
  repository: MeetingsRepository,
): MeetingsService {
  const rangeCache = new Map<string, Meeting[]>();

  return {
    listByDate(dateKey: DateKey, options?: RequestOptions): Promise<Meeting[]> {
      return fetchMeetingsForDate(dateKey, (key) =>
        repository.listByDate(key, options),
      );
    },

    async listByRange(
      from: DateKey,
      to: DateKey,
      options?: RequestOptions,
    ): Promise<Meeting[]> {
      const key = `${from}..${to}`;
      const cached = rangeCache.get(key);

      if (cached) return cached;

      const meetings = await repository.listByRange(from, to, options);

      rangeCache.set(key, meetings);

      return meetings;
    },

    invalidate(): void {
      clearMeetingsCache();
      rangeCache.clear();
    },
  };
}
