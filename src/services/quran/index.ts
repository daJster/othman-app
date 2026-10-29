import { defaultHttpClient } from '@/platform/http';
import { createBboxesRepository } from './bboxes.repository';
import { createAyahContentRepository } from './content.repository';
import { createEditionsRepository } from './editions.repository';
import { createMetadataRepository } from './metadata.repository';
import { createQuranService } from './quran.service';

/**
 * App-wide Qur'an service.
 *
 * Screens and query hooks import this barrel, never a concrete repository: the
 * transport and the payload shape are this layer's business. Tests build a
 * service with `createQuranService` and fake repositories instead.
 */
export const quranService = createQuranService({
  editions: createEditionsRepository(defaultHttpClient),
  metadata: createMetadataRepository(defaultHttpClient),
  bboxes: createBboxesRepository(defaultHttpClient),
  content: createAyahContentRepository(defaultHttpClient),
});

export { createQuranService } from './quran.service';
export { QuranDataError } from '@/core/domain/quran/errors';
export type { QuranDataSource } from '@/core/domain/quran/errors';
export type {
  AyahContentRepository,
  BboxesRepository,
  EditionTable,
  EditionsRepository,
  MetadataRepository,
  QuranCatalog,
  QuranRepositories,
  QuranService,
  SurahTable,
} from './quran.types';
