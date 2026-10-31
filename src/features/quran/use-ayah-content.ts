import { useQuery } from '@tanstack/react-query';
import type { AyahContent } from '@/core/types';
import {
  toAsyncResult,
  type AsyncPresentResult,
} from '@/features/query/async-state';
import { queryKeys } from '@/services/query';
import { quranService } from '@/services/quran';

/**
 * The selected ayah's text.
 *
 * Keyed by the absolute ayah number, never by the local `ayahKey`: the latter is
 * ayah-in-surah and repeats on pages that cross a surah boundary, so it cannot
 * identify a cache entry. Passing `null` disables the query — an open panel with
 * no selection must not request ayah 1 as a placeholder.
 *
 * `staleTime: Infinity` because the text is immutable scripture, not a record
 * that changes under the reader. A failed request still surfaces as a retryable
 * error so the panel can offer it.
 */
export function useAyahContent(
  absoluteNumber: number | null,
): AsyncPresentResult<AyahContent> {
  const query = useQuery({
    queryKey: queryKeys.quran.ayah(absoluteNumber ?? 0),
    queryFn: () => {
      if (absoluteNumber === null) {
        throw new Error('ayah content requested without a selection');
      }

      return quranService.loadAyah(absoluteNumber);
    },
    enabled: absoluteNumber !== null,
    staleTime: Infinity,
  });

  return toAsyncResult(query);
}
