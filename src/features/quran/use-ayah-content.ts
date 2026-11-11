import { api, useApiQuery } from '@/api';
import type { AyahContent } from '@/core/types';
import {
  toAsyncResult,
  type AsyncPresentResult,
} from '@/features/query/async-state';

/**
 * The selected ayah's text.
 *
 * Keyed by the absolute ayah number, never by the local `ayahKey`: the latter is
 * ayah-in-surah and repeats on pages that cross a surah boundary, so it cannot
 * identify a cache entry. Passing `null` disables the query — an open panel with
 * no selection must not request ayah 1 as a placeholder.
 *
 * `api.quran.ayah` carries the `static` policy: the text is immutable scripture,
 * not a record that changes under the reader. A failed request still surfaces
 * as a retryable error so the panel can offer it.
 */
export function useAyahContent(
  absoluteNumber: number | null,
): AsyncPresentResult<AyahContent> {
  const query = useApiQuery(api.quran.ayah, { absoluteNumber });

  return toAsyncResult(query);
}
