import { parseEditionBboxes } from '@/core/domain/quran/parse';
import type { HttpClient } from '@/platform/http';
import type { BboxesRepository } from './quran.types';

/**
 * Both ayah-coordinate tables for one edition.
 *
 * Two files, one round trip each, fetched together: the page-indexed table is
 * what a page turn reads, the surah-indexed table is what a jump reads, and
 * neither is usable without the other. The web provider also fetched these in
 * parallel; this keeps that and adds the validation the web app never had.
 *
 * The CDN publishes absolute-pixel files as well (`bboxUrl`,
 * `bboxReversedUrl`). They are not read: the reader scales the mushaf, and only
 * the normalised fractions stay correct at every size.
 */
export function createBboxesRepository(client: HttpClient): BboxesRepository {
  return {
    async load(edition) {
      const [surahPayload, pagePayload] = await Promise.all([
        client.get<unknown>(edition.bboxNormUrl),
        client.get<unknown>(edition.bboxReversedNormUrl),
      ]);

      return parseEditionBboxes(surahPayload, pagePayload, edition);
    },
  };
}
