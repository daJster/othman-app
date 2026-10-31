import type {
  BookContentType,
  ContentBody,
  ContentSource,
  SurahInfoSection,
} from '@/core/types';

/**
 * Tafsir / e3rab / translation contracts.
 *
 * `LocalAyah` is surah plus ayah-in-surah, matching the provider's documented
 * path. It deliberately does not carry the absolute number: the book endpoint
 * is local, and passing an absolute number there is the reference panel's
 * request mismatch (`2:262` is absolute 269).
 */
export type LocalAyah = {
  surah: number;
  /** Ayah-in-surah, 1–286. */
  ayah: number;
};

export interface TafsirRepository {
  sources(type: BookContentType, ayah: LocalAyah): Promise<ContentSource[]>;
  content(
    type: BookContentType,
    ayah: LocalAyah,
    sourceId: number,
  ): Promise<ContentBody>;
  surahInfo(surah: number): Promise<SurahInfoSection[]>;
}

export type TafsirService = TafsirRepository;
