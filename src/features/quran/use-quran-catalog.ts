import { useQuery } from '@tanstack/react-query';
import {
  toAsyncResult,
  type AsyncPresentResult,
} from '@/features/query/async-state';
import { queryKeys } from '@/services/query';
import { quranService, type QuranCatalog } from '@/services/quran';

/**
 * Editions + surah metadata.
 *
 * `staleTime: Infinity` because the payload is a static asset on a CDN, not a
 * database row: it changes when the app ships a new edition list, and
 * re-fetching it on every reader mount would delay the first page for no gain.
 * A failed read is still retried by TanStack's own backoff, and the screen's
 * `ErrorState` offers a manual retry.
 *
 * There is no `isEmpty` rule: a catalog with no editions is a broken payload
 * caught by the parser, not a legitimate empty state.
 */
export function useQuranCatalog(): AsyncPresentResult<QuranCatalog> {
  const query = useQuery({
    queryKey: queryKeys.quran.catalog,
    queryFn: () => quranService.loadCatalog(),
    staleTime: Infinity,
  });

  return toAsyncResult(query);
}
