import { defaultHttpClient } from '@/platform/http';
import { createTafsirRepository } from './tafsir.repository';
import { createTafsirService } from './tafsir.service';

/**
 * App-wide content service.
 *
 * Screens and query hooks import this barrel, never the repository: the
 * transport and the provider shape stay this layer's business.
 */
export const tafsirService = createTafsirService(
  createTafsirRepository(defaultHttpClient),
);

export { createTafsirService } from './tafsir.service';
export { createTafsirRepository } from './tafsir.repository';
export type {
  LocalAyah,
  TafsirRepository,
  TafsirService,
} from './tafsir.types';
