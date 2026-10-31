import type { QuranRepositories, QuranService } from './quran.types';

/**
 * The reader's data facade.
 *
 * It exists to encode the two parallel loads the plan asks for — editions +
 * metadata at boot, both bbox tables per edition — in one place, so a screen or
 * a query hook cannot accidentally reintroduce the serial waterfall the web
 * provider had.
 *
 * No caching here: TanStack Query already owns it, and a second cache would
 * mean two expiry rules for the same bytes.
 */
export function createQuranService(
  repositories: QuranRepositories,
): QuranService {
  return {
    async loadCatalog() {
      const [editions, surahs] = await Promise.all([
        repositories.editions.list(),
        repositories.metadata.list(),
      ]);

      return { editions, surahs };
    },

    loadBboxes(edition) {
      return repositories.bboxes.load(edition);
    },

    loadAyah(absoluteNumber) {
      return repositories.content.byAbsoluteNumber(absoluteNumber);
    },
  };
}
