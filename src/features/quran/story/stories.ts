import { isSurahNumber, QURAN_PAGE_COUNT } from '@/core/domain/quran/surah';

/**
 * The surah the landing page suggests, and where its note lives.
 *
 * Facts (name, place of revelation, ayah count) are read from the catalog at
 * render; the mock carries only the note's locale key and the page the reader
 * opens at. Keeping the facts out of this file is what stops a suggestion from
 * disagreeing with the mushaf the reader is actually holding.
 */

/**
 * Literal keys, not `string`: `t()` checks them against the locale, and the
 * i18n audit then checks that Arabic defines the same notes.
 */
export type StoryNoteKey =
  | 'quran.story.notes.fatiha'
  | 'quran.story.notes.yasin'
  | 'quran.story.notes.rahman'
  | 'quran.story.notes.mulk'
  | 'quran.story.notes.ikhlas';

export type Story = {
  /** Surah number, 1–114. Validated against the domain rule at module load. */
  surah: number;
  /** Page the reader opens at. */
  page: number;
  /** Locale key, not a string: both languages must define it. */
  noteKey: StoryNoteKey;
};

/**
 * Five suggestions, rotated by the day of the year.
 *
 * Each `page` is the page the surah begins on in the standard 604-page Madani
 * mushaf, so the tap opens the reader at the surah's first ayah rather than at
 * an arbitrary page:
 *
 * - Al-Fatiha (1) — page 1, the first page of the mushaf.
 * - Ya-Sin (36) — page 440.
 * - Ar-Rahman (55) — page 531.
 * - Al-Mulk (67) — page 562, the first page of the twenty-ninth juz.
 * - Al-Ikhlas (112) — page 604, which it shares with Al-Falaq and An-Nas.
 *
 * The notes live in `quran.story.notes.*` and are descriptive only: place,
 * length, one line on theme. No dates, no causes of revelation, no ranking.
 */
export const STORIES = [
  { surah: 1, page: 1, noteKey: 'quran.story.notes.fatiha' },
  { surah: 36, page: 440, noteKey: 'quran.story.notes.yasin' },
  { surah: 55, page: 531, noteKey: 'quran.story.notes.rahman' },
  { surah: 67, page: 562, noteKey: 'quran.story.notes.mulk' },
  { surah: 112, page: 604, noteKey: 'quran.story.notes.ikhlas' },
] as const satisfies readonly Story[];

// A bad number here would open the wrong surah, so it fails at import time
// rather than at the reader's tap. The page guard states the same contract:
// this edition has 604 pages, and a suggestion outside it cannot be opened.
for (const story of STORIES) {
  if (!isSurahNumber(story.surah)) {
    throw new Error(`Story has an invalid surah number: ${story.surah}`);
  }

  if (
    !Number.isInteger(story.page) ||
    story.page < 1 ||
    story.page > QURAN_PAGE_COUNT
  ) {
    throw new Error(`Story has an invalid page: ${story.page}`);
  }
}
