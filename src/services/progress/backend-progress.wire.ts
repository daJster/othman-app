import {
  array,
  asDateKey,
  asFiniteNumber,
  asInteger,
  asRecord,
  at,
  missingAsNull,
  type Parser,
} from '@/core/domain/wire/shape';
import {
  clampPercent,
  type SurahProgress,
} from '@/core/domain/progress/surah-progress';
import { SURAH_COUNT } from '@/core/domain/quran/surah';

/**
 * The wire shape of the memorisation snapshot.
 *
 * `percent` is canonicalised here, not trusted: the heatmap maps it to a colour
 * and the summary averages it, so an out-of-range value must become 0 or 100
 * before either sees it. The surah number is a hard error, because a row for a
 * surah that does not exist cannot be placed on the grid at all.
 */

const parseRow: Parser<SurahProgress> = (value, path) => {
  const row = asRecord(value, path);

  return {
    surahNumber: asInteger(
      row.surahNumber,
      at(path, 'surahNumber'),
      1,
      SURAH_COUNT,
    ),
    percent: clampPercent(asFiniteNumber(row.percent, at(path, 'percent'))),
    // An unset date is "never reviewed", which is the same as null.
    lastReviewed: missingAsNull(asDateKey)(
      row.lastReviewed,
      at(path, 'lastReviewed'),
    ),
  };
};

/** `GET /v1/quran/progress` → `{ progress }`. */
export function parseProgressResponse(payload: unknown): SurahProgress[] {
  return array(parseRow)(asRecord(payload, 'response').progress, 'progress');
}
