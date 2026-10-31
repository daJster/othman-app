import {
  bandOf,
  clampPercent,
  summarizeProgress,
  type SurahProgress,
} from '@/core/domain/progress/surah-progress';
import { SURAH_COUNT } from '@/core/domain/quran/surah';

describe('clampPercent', () => {
  it('rounds and clamps into 0-100', () => {
    expect(clampPercent(42.4)).toBe(42);
    expect(clampPercent(42.6)).toBe(43);
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(180)).toBe(100);
  });

  it('treats a non-finite value as zero rather than rendering NaN', () => {
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(clampPercent(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('bandOf', () => {
  it('splits the range into the three bands the UI renders', () => {
    expect(bandOf(0)).toBe('not-started');
    expect(bandOf(1)).toBe('in-progress');
    expect(bandOf(99)).toBe('in-progress');
    expect(bandOf(100)).toBe('memorised');
  });
});

describe('summarizeProgress', () => {
  const rows: SurahProgress[] = [
    { surahNumber: 1, percent: 100, lastReviewed: '2026-10-01' },
    { surahNumber: 2, percent: 50, lastReviewed: '2026-10-02' },
    { surahNumber: 3, percent: 0, lastReviewed: null },
    { surahNumber: 4, percent: 100, lastReviewed: '2026-10-04' },
  ];

  it('averages every row and counts the bands', () => {
    expect(summarizeProgress(rows)).toEqual({
      averagePercent: 63,
      memorised: 2,
      started: 3,
      total: 4,
    });
  });

  it('counts a completed surah as started', () => {
    expect(summarizeProgress(rows).started).toBe(3);
  });

  it('returns zeroes for an empty list instead of dividing by zero', () => {
    expect(summarizeProgress([])).toEqual({
      averagePercent: 0,
      memorised: 0,
      started: 0,
      total: 0,
    });
  });

  it('is consistent with the surah count it is normally given', () => {
    const full: SurahProgress[] = Array.from(
      { length: SURAH_COUNT },
      (_, index) => ({
        surahNumber: index + 1,
        percent: 100,
        lastReviewed: '2026-10-01',
      }),
    );

    expect(summarizeProgress(full)).toEqual({
      averagePercent: 100,
      memorised: SURAH_COUNT,
      started: SURAH_COUNT,
      total: SURAH_COUNT,
    });
  });
});
