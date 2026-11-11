import { api, useApiQuery } from '@/api';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import { toAsyncResult, type AsyncResult } from '@/features/query/async-state';

/**
 * The 114 rows behind the heatmap.
 *
 * `isEmpty` is `rows.length === 0` — the repository returns one row per surah it
 * knows about, so "no progress recorded" is an empty list, not 114 zeroes. That
 * distinction is what lets the screen show `EmptyState` instead of a fully grey
 * grid that looks like a rendering bug.
 *
 * Screens are not expected to filter or sort these. If P5 adds a filter (by juz,
 * by band), the derived list goes through `useDeferredValue` in the screen so
 * typing in a filter does not block the grid.
 *
 * `api.progress.surah` carries the strategy: per-user rows use the `session`
 * policy, short enough that another device's write shows up without a manual
 * refresh.
 */
export function useSurahProgress(): AsyncResult<SurahProgress[]> {
  const query = useApiQuery(api.progress.surah);

  return toAsyncResult(query, (rows) => rows.length === 0);
}
