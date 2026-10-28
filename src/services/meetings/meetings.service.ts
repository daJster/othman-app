import { clearMeetingsCache } from '@/core/domain/meetings/cache';
import { fetchMeetingsForDate } from '@/core/domain/meetings/repository';
import type { DateKey, Meeting } from '@/core/types';
import type { MeetingsRepository, MeetingsService } from './meetings.types';

/**
 * Wires the cache-first domain reader to a concrete repository.
 *
 * `core` owns *when* a day is fetched and cached; this layer only decides
 * *where* it comes from. Keeping the two apart is what makes the cache testable
 * without network fakes and the repository swappable without touching caching.
 */
export function createMeetingsService(
  repository: MeetingsRepository,
): MeetingsService {
  return {
    listByDate(dateKey: DateKey): Promise<Meeting[]> {
      return fetchMeetingsForDate(dateKey, (key) => repository.listByDate(key));
    },

    invalidate(): void {
      clearMeetingsCache();
    },
  };
}
