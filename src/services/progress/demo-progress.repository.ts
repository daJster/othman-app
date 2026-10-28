import {
  SURAH_COUNT,
  clampPercent,
  type SurahProgress,
} from '@/core/domain/progress/surah-progress';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { DateKey } from '@/core/types';
import type { ProgressRepository } from './progress.types';

/**
 * Demo progress — **temporary scaffolding**.
 *
 * There is no backend record to read until P3.3 (accounts) and P5 (reader)
 * exist. This repository generates one fixed record so the heatmap, the legend
 * and the detail sheet are explorable today, and — more importantly — so the
 * screen has something deterministic to test against.
 *
 * Deterministic, not random: `Math.random()` would make the screen look
 * different on every launch, change the summary counts mid-session, and make a
 * screenshot impossible to compare. The numbers below are a fixed function of
 * the surah number, shaped like a student who memorised Juz' Amma first: the
 * short surahs at the end are furthest along, the long middle is patchy.
 *
 * The value is a **percentage**, not an ayah count. Getting ayat right would
 * mean shipping a 114-entry ayah table, which is exactly the metadata P5.1
 * ports from the real source; inventing one here would create two sources of
 * truth for the same numbers.
 */

/** Anchor for "last reviewed". Fixed, so the labels do not drift with today. */
const ANCHOR_DATE = new Date(2026, 9, 20, 12);

/** Artificial latency so the loading state is exercised in development. */
const MOCK_LATENCY_MS = 250;

function percentFor(surahNumber: number): number {
  // Al-Ikhlas, Al-Falaq, An-Nas: the three everyone starts with.
  if (surahNumber >= 112) return 100;

  // Juz' Amma: mostly learnt, a few still in progress.
  if (surahNumber >= 78) return clampPercent(60 + ((surahNumber * 7) % 41));

  // Al-Fatiha and the first twenty: scattered, a mix of done and untouched.
  if (surahNumber <= 20) return clampPercent((surahNumber * 11) % 101);

  // Al-Baqarah through Al-Mursalat: the long middle, still being worked on.
  return clampPercent((surahNumber * 13 + 17) % 61);
}

function reviewedDaysAgo(surahNumber: number): DateKey {
  const date = new Date(ANCHOR_DATE);
  date.setDate(date.getDate() - (2 + ((surahNumber * 7) % 40)));

  return formatDateKey(date);
}

export const DEMO_SURAH_PROGRESS: readonly SurahProgress[] = Array.from(
  { length: SURAH_COUNT },
  (_, index) => {
    const surahNumber = index + 1;
    const percent = percentFor(surahNumber);

    return {
      surahNumber,
      percent,
      lastReviewed: percent === 0 ? null : reviewedDaysAgo(surahNumber),
    };
  },
);

export const demoProgressRepository: ProgressRepository = {
  async listSurahProgress(): Promise<SurahProgress[]> {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

    // A copy: the fixture is a module constant and callers must not be able to
    // mutate it through the query cache.
    return DEMO_SURAH_PROGRESS.map((row) => ({ ...row }));
  },
};
