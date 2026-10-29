/**
 * Qur'an structure constants.
 *
 * Shared by the payload parsers, the reader store and the progress heatmap, so
 * "114 surahs" is written once. They are facts about the mushaf, not
 * configuration: nothing here changes per build or per edition.
 */

export const SURAH_COUNT = 114;

/** Al-Baqarah is the longest surah; no surah has more ayat than this. */
export const MAX_AYAH_IN_SURAH = 286;

/** The standard Madani mushaf has 604 pages; longer editions simply start later. */
export const QURAN_PAGE_COUNT = 604;

export function isSurahNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= SURAH_COUNT;
}

export function isAyahInSurah(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_AYAH_IN_SURAH;
}
