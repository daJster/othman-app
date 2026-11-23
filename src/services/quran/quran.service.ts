import type { RequestOptions } from '@/platform/http';
import type { QuranRepositories, QuranService } from './quran.types';

/**
 * The reader's data facade.
 *
 * It exists to encode the two parallel loads the plan asks for (editions and
 * metadata at boot, both bbox tables per edition) in one place, so a screen or
 * a query hook cannot reintroduce the serial waterfall the web provider had.
 *
 * No caching here: TanStack Query already owns it, and a second cache would
 * mean two expiry rules for the same bytes.
 */
export function createQuranService(
  repositories: QuranRepositories,
): QuranService {
  return {
    async loadCatalog(options?: RequestOptions) {
      const [editions, surahs] = await Promise.all([
        repositories.editions.list(options),
        repositories.metadata.list(options),
      ]);

      return { editions, surahs };
    },

    loadBboxes(edition, options) {
      return repositories.bboxes.load(edition, options);
    },

    loadAyah(absoluteNumber, options) {
      return repositories.content.byAbsoluteNumber(absoluteNumber, options);
    },
  };
}
