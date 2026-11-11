import { isAyahInSurah, isSurahNumber } from '@/core/domain/quran/surah';
import type { SurahMetadata } from '@/core/types';
import type { Language } from '@/i18n';

/**
 * Qur'an record helpers.
 *
 * Bookmarks and notes are stored with three coordinates: surah, ayah-in-surah,
 * and an absolute ayah number (1–6236). The read APIs accept the local pair, the
 * caches key the absolute number, and the reader resolves a page from either.
 * This module does the one conversion between them, so a typo in the offset
 * arithmetic cannot ship in two screens.
 */

/** Total ayat before `surah`; `surah` is 1-based. */
export function ayahOffset(
  surahs: Readonly<Record<string, SurahMetadata>>,
  surah: number,
): number {
  let offset = 0;

  for (let number = 1; number < surah; number += 1) {
    offset += surahs[String(number)]?.ayahCount ?? 0;
  }

  return offset;
}

/**
 * The absolute ayah number for a local pair, or `null` when the pair does not
 * exist. A null is a validation failure, never a guessed position.
 */
export function absoluteAyahNumber(
  surahs: Readonly<Record<string, SurahMetadata>>,
  surah: number,
  ayah: number,
): number | null {
  if (!isSurahNumber(surah) || !isAyahInSurah(ayah)) return null;

  const metadata = surahs[String(surah)];
  if (!metadata || ayah > metadata.ayahCount) return null;

  return ayahOffset(surahs, surah) + ayah;
}

/** `Al-Fatihah` / `الفاتحة`, with the number as a table-of-contents hint. */
export function surahLabel(
  metadata: SurahMetadata | undefined,
  surah: number,
  language: Language,
): string {
  if (!metadata) {
    return language === 'ar' ? `سورة ${surah}` : `Surah ${surah}`;
  }

  return language === 'ar' ? metadata.name : metadata.nameEnglish;
}

/** The reference line under a bookmark or note. */
export function ayahReference(
  surahName: string,
  ayah: number,
  language: Language,
): string {
  const digits = new Intl.NumberFormat(
    language === 'ar' ? 'ar-EG-u-nu-arab' : 'en',
  ).format(ayah);

  return language === 'ar'
    ? `${surahName} · الآية ${digits}`
    : `${surahName} · Ayah ${digits}`;
}
