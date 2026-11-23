import type {
  BookContentType,
  ContentBody,
  ContentSource,
  SurahInfoSection,
} from '@/core/types';
import type { RequestOptions } from '@/platform/http';

/**
 * Tafsir, e3rab and translation contracts.
 *
 * `LocalAyah` is surah plus ayah-in-surah, matching the provider's documented
 * path. It deliberately does not carry the absolute number: the book endpoint
 * is local, and passing an absolute number there is the reference panel's
 * request mismatch (`2:262` is absolute 269).
 */
export type LocalAyah = {
  surah: number;
  /** Ayah-in-surah, 1 to 286. */
  ayah: number;
};

export interface TafsirRepository {
  sources(
    type: BookContentType,
    ayah: LocalAyah,
    options?: RequestOptions,
  ): Promise<ContentSource[]>;
  content(
    type: BookContentType,
    ayah: LocalAyah,
    sourceId: number,
    options?: RequestOptions,
  ): Promise<ContentBody>;
  surahInfo(
    surah: number,
    options?: RequestOptions,
  ): Promise<SurahInfoSection[]>;
}

export type TafsirService = TafsirRepository;
