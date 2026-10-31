import { quranpediaUrl } from '@/core/config';
import type { BookContentType } from '@/core/types';
import { isAyahInSurah, isSurahNumber } from '@/core/domain/quran/surah';
import {
  parseBookContent,
  parseContentSources,
  parseSurahInformation,
} from '@/core/domain/quran/tafsir';
import type { HttpClient } from '@/platform/http';
import type { LocalAyah, TafsirRepository } from './tafsir.types';

/**
 * quranpedia content repository.
 *
 * Validated against recorded responses (see `__fixtures__/README.md`):
 *
 *  - option lists live at `/v1/ayah/{surah}/{ayah}/{service}`, where the
 *    service is `translations` (plural) for translations;
 *  - book text lives at `/v1/ayah/{surah}/{ayah}/book/{bookId}`;
 *  - surah information is surah-level, not a book.
 *
 * Every path uses the local ayah number. The reference panel mixed absolute and
 * local numbers; that only worked because the option endpoint ignores the
 * number. The book endpoint does not.
 */
const SERVICE_PATH: Readonly<Record<BookContentType, string>> = {
  tafsir: 'tafsir',
  e3rab: 'e3rab',
  translation: 'translations',
};

function requireLocalAyah(ayah: LocalAyah): LocalAyah {
  if (!isSurahNumber(ayah.surah) || !isAyahInSurah(ayah.ayah)) {
    throw new RangeError(
      `Ayah must be surah 1-114 and ayah 1-286, received ${ayah.surah}:${ayah.ayah}`,
    );
  }

  return ayah;
}

function requireSourceId(sourceId: number): number {
  if (!Number.isInteger(sourceId) || sourceId < 1) {
    throw new RangeError(
      `Source id must be a positive integer, received ${sourceId}`,
    );
  }

  return sourceId;
}

export function createTafsirRepository(client: HttpClient): TafsirRepository {
  return {
    async sources(type, ayah) {
      const local = requireLocalAyah(ayah);
      const payload = await client.get<unknown>(
        quranpediaUrl(
          `v1/ayah/${local.surah}/${local.ayah}/${SERVICE_PATH[type]}`,
        ),
      );

      return parseContentSources(payload);
    },

    async content(type, ayah, sourceId) {
      const local = requireLocalAyah(ayah);
      const id = requireSourceId(sourceId);
      // `type` is carried for the caller's cache identity; the book endpoint
      // itself is type-agnostic and always returns the book's language.
      void type;
      const payload = await client.get<unknown>(
        quranpediaUrl(`v1/ayah/${local.surah}/${local.ayah}/book/${id}`),
      );

      return parseBookContent(payload);
    },

    async surahInfo(surah) {
      if (!isSurahNumber(surah)) {
        throw new RangeError(`Surah must be 1-114, received ${surah}`);
      }

      const payload = await client.get<unknown>(
        quranpediaUrl(`v1/surah/information/${surah}`),
      );

      return parseSurahInformation(payload);
    },
  };
}
