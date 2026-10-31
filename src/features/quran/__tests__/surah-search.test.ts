import { filterSurahs, sortSurahs } from '../surah-search';
import type { SurahMetadata } from '@/core/types';

/**
 * The picker's only non-trivial logic. A reader types the name they know: the
 * Arabic one, the Latin transliteration, or a number. All three have to work,
 * and Arabic is typed without the diacritics the mushaf prints.
 */
const SURAHS: SurahMetadata[] = [
  {
    number: 2,
    name: 'البقرة',
    nameEnglish: 'Al-Baqarah',
    location: 'madina',
    ayahCount: 286,
  },
  {
    number: 3,
    name: 'آل عمران',
    nameEnglish: "Ali 'Imran",
    location: 'madina',
    ayahCount: 200,
  },
  {
    number: 114,
    name: 'الناس',
    nameEnglish: 'An-Nas',
    location: 'makka',
    ayahCount: 6,
  },
];

const numbers = (rows: readonly SurahMetadata[]) => rows.map((r) => r.number);

describe('sortSurahs', () => {
  it('orders the catalog by surah number, not by object key', () => {
    const table = Object.fromEntries(SURAHS.map((s) => [String(s.number), s]));

    expect(numbers(sortSurahs(table))).toEqual([2, 3, 114]);
  });
});

describe('filterSurahs', () => {
  it('returns every surah for an empty query', () => {
    expect(filterSurahs(SURAHS, '   ')).toBe(SURAHS);
  });

  it('matches a Latin transliteration, case-insensitively', () => {
    expect(numbers(filterSurahs(SURAHS, 'al-baq'))).toEqual([2]);
    expect(numbers(filterSurahs(SURAHS, 'AN-NAS'))).toEqual([114]);
  });

  it('matches the Arabic name without its diacritics', () => {
    // "آل عمران" typed as "ال عمران", and "البقرة" as "البقره".
    expect(numbers(filterSurahs(SURAHS, 'ال عمران'))).toEqual([3]);
    expect(numbers(filterSurahs(SURAHS, 'البقره'))).toEqual([2]);
  });

  it('matches a surah number', () => {
    expect(numbers(filterSurahs(SURAHS, '114'))).toEqual([114]);
    expect(numbers(filterSurahs(SURAHS, '1'))).toEqual([]);
  });

  it('returns nothing when the query matches nothing', () => {
    expect(filterSurahs(SURAHS, 'not a surah')).toEqual([]);
  });
});
