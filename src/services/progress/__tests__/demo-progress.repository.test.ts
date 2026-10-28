import { isDateKey } from '@/core/domain/meetings/date-key';
import {
  SURAH_COUNT,
  type SurahProgress,
} from '@/core/domain/progress/surah-progress';
import {
  DEMO_SURAH_PROGRESS,
  demoProgressRepository,
} from '@/services/progress/demo-progress.repository';

/**
 * The fixture is temporary (P3.3 replaces the repository), but it is the data
 * every P4.4 test and screenshot reads, so its invariants are pinned here: a
 * fixed shape, in mushaf order, and values the heatmap ramp can actually draw.
 *
 * Latency is faked so the suite does not sleep for the mock's 250 ms.
 */
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

async function read(): Promise<SurahProgress[]> {
  const pending = demoProgressRepository.listSurahProgress();
  await jest.advanceTimersByTimeAsync(300);

  return pending;
}

describe('DEMO_SURAH_PROGRESS', () => {
  it('covers every surah exactly once, in mushaf order', () => {
    expect(DEMO_SURAH_PROGRESS).toHaveLength(SURAH_COUNT);
    expect(DEMO_SURAH_PROGRESS.map((row) => row.surahNumber)).toEqual(
      Array.from({ length: SURAH_COUNT }, (_, index) => index + 1),
    );
  });

  it('keeps every percentage a whole number the ramp can draw', () => {
    for (const row of DEMO_SURAH_PROGRESS) {
      expect(Number.isInteger(row.percent)).toBe(true);
      expect(row.percent).toBeGreaterThanOrEqual(0);
      expect(row.percent).toBeLessThanOrEqual(100);
    }
  });

  it('dates exactly the surahs that have been started', () => {
    for (const row of DEMO_SURAH_PROGRESS) {
      if (row.percent === 0) {
        expect(row.lastReviewed).toBeNull();
      } else {
        expect(row.lastReviewed).not.toBeNull();
        expect(isDateKey(row.lastReviewed)).toBe(true);
      }
    }
  });

  it('contains a story worth rendering: untouched, partial and complete surahs', () => {
    expect(DEMO_SURAH_PROGRESS.some((row) => row.percent === 0)).toBe(true);
    expect(
      DEMO_SURAH_PROGRESS.some((row) => row.percent > 0 && row.percent < 100),
    ).toBe(true);
    expect(DEMO_SURAH_PROGRESS.some((row) => row.percent === 100)).toBe(true);
  });

  it('finishes the three short surahs everyone starts with', () => {
    for (const surahNumber of [112, 113, 114]) {
      expect(DEMO_SURAH_PROGRESS[surahNumber - 1].percent).toBe(100);
    }
  });
});

describe('demoProgressRepository', () => {
  it('is deterministic across reads', async () => {
    const [first, second] = await Promise.all([read(), read()]);

    expect(second).toEqual(first);
  });

  it('returns detached rows so a caller cannot mutate the fixture', async () => {
    const rows = await read();
    rows[0].percent = 3;

    expect(DEMO_SURAH_PROGRESS[0].percent).not.toBe(3);
    expect((await read())[0].percent).toBe(DEMO_SURAH_PROGRESS[0].percent);
  });
});
