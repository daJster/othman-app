import { api, useApiQuery } from '@/api';
import type { EditionBboxes, QuranEdition } from '@/core/types';
import {
  toAsyncResult,
  type AsyncPresentResult,
} from '@/features/query/async-state';

/**
 * Both bbox tables of one edition.
 *
 * These are the big payloads (a few megabytes each), so they are keyed by the
 * edition `key` and fetched only once the catalog has resolved one: before
 * that the reader would fetch the default edition's tables and then throw them
 * away when the stored preference wins. `api.quran.bboxes` encodes both facts —
 * the key includes the edition, and `ready` requires one.
 *
 * The `static` policy keeps the tables alive across reader mounts, so reopening
 * the reader is a cache hit rather than a multi-megabyte download.
 */
export function useEditionBboxes(
  edition: QuranEdition | null,
): AsyncPresentResult<EditionBboxes> {
  const query = useApiQuery(api.quran.bboxes, { edition });

  return toAsyncResult(query);
}
