import {
  clampPractice,
  isGoldenDay,
  practiceDayKey,
  type PracticeEntry,
} from '@/core/domain/practice/practice';

/** A local moment, so the 02:00 shift is read in the device's zone. */
function at(year: number, month: number, day: number, hour: number): Date {
  return new Date(year, month - 1, day, hour, 30, 0, 0);
}

const complete: PracticeEntry = {
  day: '2026-11-20',
  salah: 5,
  duaa: 3,
  nafila: 1,
  pages: 1,
};

describe('practice day', () => {
  it('keeps the evening after midnight on the day that is ending', () => {
    // 01:30 still belongs to the 20th, so a late session is not lost.
    expect(practiceDayKey(at(2026, 11, 21, 1))).toBe('2026-11-20');
  });

  it('starts a new day at 02:00 local time', () => {
    expect(practiceDayKey(at(2026, 11, 21, 2))).toBe('2026-11-21');
  });

  it('rolls the month and year correctly before 02:00', () => {
    expect(practiceDayKey(at(2027, 1, 1, 1))).toBe('2026-12-31');
  });
});

describe('golden day', () => {
  it('is golden only when all four gauges are full', () => {
    expect(isGoldenDay(complete)).toBe(true);

    for (const key of ['salah', 'duaa', 'nafila', 'pages'] as const) {
      expect(isGoldenDay({ ...complete, [key]: 0 })).toBe(false);
    }
  });

  it('clamps stored values to each gauge range', () => {
    expect(clampPractice({ salah: 9, duaa: -2, nafila: 40, pages: 2 })).toEqual(
      {
        salah: 5,
        duaa: 0,
        nafila: 30,
        pages: 1,
      },
    );

    expect(
      clampPractice({ salah: Number.NaN, duaa: 1.6, nafila: 0.4, pages: 1 }),
    ).toEqual({ salah: 0, duaa: 2, nafila: 0, pages: 1 });

    // Counts that may pass their gauge target are capped far above it.
    expect(clampPractice({ duaa: 40 }).duaa).toBe(30);
  });
});
