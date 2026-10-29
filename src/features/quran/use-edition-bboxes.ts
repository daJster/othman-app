import { useQuery } from '@tanstack/react-query';
import type { EditionBboxes, QuranEdition } from '@/core/types';
import {
  toAsyncResult,
  type AsyncPresentResult,
} from '@/features/query/async-state';
import { queryKeys } from '@/services/query';
import { quranService } from '@/services/quran';

/**
 * Both bbox tables of one edition.
 *
 * These are the big payloads (a few megabytes each), so they are keyed by the
 * edition `key` and fetched only once the catalog has resolved one: before
 * that the reader would fetch the default edition's tables and then throw them
 * away when the stored preference wins.
 *
 * `staleTime: Infinity` for the same reason as the catalog. TanStack still
 * keeps the tables alive across reader mounts, so reopening the reader is a
 * cache hit rather than a multi-megabyte download.
 */
export function useEditionBboxes(
  edition: QuranEdition | null,
): AsyncPresentResult<EditionBboxes> {
  const query = useQuery({
    queryKey: queryKeys.quran.bboxes(edition?.key ?? 'none'),
    queryFn: () => {
      // Unreachable while the query is disabled, and a thrown error would be
      // reported through the same `error` branch as a network failure.
      if (!edition) throw new Error('bboxes requested without an edition');

      return quranService.loadBboxes(edition);
    },
    enabled: edition !== null,
    staleTime: Infinity,
  });

  return toAsyncResult(query);
}
