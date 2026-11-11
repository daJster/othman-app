import { api, useApiQuery } from '@/api';
import {
  toAsyncResult,
  type AsyncPresentResult,
} from '@/features/query/async-state';
import type { QuranCatalog } from '@/services/quran';

/**
 * Editions + surah metadata.
 *
 * The strategy lives on `api.quran.catalog`: the `static` policy, because the
 * payload is a CDN asset, not a database row. It changes when the app ships a
 * new edition list, and re-fetching it on every reader mount would delay the
 * first page for no gain. A failed read is still retried by TanStack's backoff,
 * and the screen's `ErrorState` offers a manual retry.
 *
 * There is no `isEmpty` rule: a catalog with no editions is a broken payload
 * caught by the parser, not a legitimate empty state.
 */
export function useQuranCatalog(): AsyncPresentResult<QuranCatalog> {
  const query = useApiQuery(api.quran.catalog);

  return toAsyncResult(query);
}
