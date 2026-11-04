import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';

/**
 * Demo history used only when no real log exists yet.
 *
 * Eight days ending yesterday. Today is deliberately absent: today's entry has
 * to come from real reading, so the resume card and the hizb gauge stay honest
 * about the current session. Pages follow the standard Madani mushaf, and every
 * surah is the one that owns its page.
 */

function atDay(daysAgo: number): Date {
  const date = new Date();
  date.setHours(20, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);

  return date;
}

function seedEntry(
  daysAgo: number,
  page: number,
  surah: number,
  readPages: number[],
): ReadingEntry {
  const at = atDay(daysAgo);

  return {
    day: formatDateKey(at),
    page,
    surah,
    ayahKey: null,
    editionKey: '1',
    at: at.getTime(),
    readPages,
  };
}

/** Newest first, matching `appendReading`'s ordering. */
export const SEED_READING_LOG: ReadingEntry[] = [
  // An-Nas starts on page 604.
  seedEntry(1, 604, 114, [595, 596, 597, 598, 599, 600, 601, 602, 603, 604]),
  // Ya-Sin starts on page 440.
  seedEntry(2, 440, 36, [431, 432, 433, 434, 435, 436, 437, 438, 439, 440]),
  // Al-Hajj starts on page 332.
  seedEntry(3, 338, 22, [329, 330, 331, 332, 333, 334, 335, 336, 337, 338]),
  // Ibrahim starts on page 255.
  seedEntry(4, 258, 14, [249, 250, 251, 252, 253, 254, 255, 256, 257, 258]),
  // Al-A'raf starts on page 151.
  seedEntry(5, 174, 7, [165, 166, 167, 168, 169, 170, 171, 172, 173, 174]),
  // An-Nisa starts on page 77.
  seedEntry(6, 100, 4, [91, 92, 93, 94, 95, 96, 97, 98, 99, 100]),
  // Aal-Imran starts on page 50.
  seedEntry(7, 50, 3, [42, 43, 44, 45, 46, 47, 48, 49, 50]),
  // Al-Baqara starts on page 2.
  seedEntry(8, 3, 2, [1, 2, 3]),
];
