import type { SurahMetadata } from '@/core/types';

/**
 * Surah picker search.
 *
 * The 114 rows are static metadata, so the filter is a pure function rather
 * than a hook: the sheet only has to own the query string, and the matching
 * rules can be tested without a renderer.
 *
 * Matching is deliberately forgiving. A reader types Arabic without the
 * diacritics the mushaf prints (`آل عمران` vs `ال عمران`), or the Latin
 * transliteration (`Al-Imran`), or just the number. Normalising both sides is
 * what makes one search box serve all three.
 */

/** Arabic diacritics, tatweel, and the letter variants that differ by shaping. */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\s-]+/g, ' ');
}

/** Every surah, in mushaf order, from the catalog's number-keyed table. */
export function sortSurahs(
  surahs: Readonly<Record<string, SurahMetadata>>,
): SurahMetadata[] {
  return Object.values(surahs).sort((a, b) => a.number - b.number);
}

/**
 * Rows matching `query`.
 *
 * An empty query returns every row; a query that matches nothing returns `[]`
 * so the sheet can show its own empty state rather than an accidental "all".
 */
export function filterSurahs(
  surahs: readonly SurahMetadata[],
  query: string,
): readonly SurahMetadata[] {
  const needle = normalize(query);
  if (!needle) return surahs;

  return surahs.filter((surah) => {
    if (String(surah.number) === needle) return true;

    return (
      normalize(surah.name).includes(needle) ||
      normalize(surah.nameEnglish).includes(needle)
    );
  });
}
