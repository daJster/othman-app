import type { TafsirRepository, TafsirService } from './tafsir.types';

/**
 * Content use-cases over an injected repository.
 *
 * A factory like the other services: tests inject fake repositories and the
 * screen never imports the HTTP implementation. No caching here: TanStack Query
 * owns expiry, and a second cache would duplicate it.
 */
export function createTafsirService(
  repository: TafsirRepository,
): TafsirService {
  return {
    sources: (type, ayah, options) => repository.sources(type, ayah, options),
    content: (type, ayah, sourceId, options) =>
      repository.content(type, ayah, sourceId, options),
    surahInfo: (surah, options) => repository.surahInfo(surah, options),
  };
}
