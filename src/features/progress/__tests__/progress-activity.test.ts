import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import {
  latestReviewDate,
  recentReviews,
  reviewDaysForWeek,
  reviewTrend,
  totalReviews,
} from '@/features/progress/progress-activity';

/**
 * The activity surfaces count `lastReviewed` days; there is no second log to
 * consult. These tests pin the three things a fake date can get wrong: which
 * day starts the week, that a review lands in exactly one day and one week,
 * and that the trend is oldest-first.
 */
const ROWS: SurahProgress[] = [
  { surahNumber: 1, percent: 100, lastReviewed: '2026-10-12' },
  { surahNumber: 2, percent: 50, lastReviewed: '2026-10-12' },
  { surahNumber: 3, percent: 25, lastReviewed: '2026-10-14' },
  { surahNumber: 4, percent: 10, lastReviewed: '2026-09-30' },
  { surahNumber: 5, percent: 0, lastReviewed: null },
];

describe('progress activity', () => {
  it('finds the latest review, ignoring never-started rows', () => {
    expect(latestReviewDate(ROWS)?.toISOString().slice(0, 10)).toBe(
      '2026-10-14',
    );
    expect(latestReviewDate([ROWS[4] ?? ROWS[0]])).toBeNull();
  });

  it('puts the reviews in the week that contains the latest one', () => {
    const days = reviewDaysForWeek(ROWS, 'en');

    expect(days).toHaveLength(7);
    expect(days.map((day) => day.day)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
    expect(days.map((day) => day.count)).toEqual([2, 0, 1, 0, 0, 0, 0]);
    expect(totalReviews(days)).toBe(3);
  });

  it('starts an Arabic week on Saturday', () => {
    const days = reviewDaysForWeek(ROWS, 'ar');

    expect(days[0]?.day).toBe('2026-10-10');
    expect(days[6]?.day).toBe('2026-10-16');
  });

  it('returns weekly counts oldest first, ending on the latest week', () => {
    const weeks = reviewTrend(ROWS, 'en', 3);

    expect(weeks).toHaveLength(3);
    expect(weeks.map((week) => week.start)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
    ]);
    expect(weeks.map((week) => week.count)).toEqual([1, 0, 3]);
  });

  it('lists the most recent reviews first and respects the limit', () => {
    const reviews = recentReviews(ROWS, 2);

    expect(reviews.map((row) => row.surahNumber)).toEqual([3, 1]);
    expect(recentReviews(ROWS, 10)).toHaveLength(4);
  });
});
