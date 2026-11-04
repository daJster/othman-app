import {
  appendReading,
  hizbProgress,
  pagesOn,
  previousEntries,
  resumeEntry,
  type ReadingEntry,
} from './reading-log';

const DAY = '2026-11-01';

function entry(
  day: string,
  page: number,
  extra: Partial<ReadingEntry> = {},
): ReadingEntry {
  return {
    day,
    page,
    surah: 1,
    ayahKey: null,
    editionKey: '1',
    at: 0,
    readPages: [page],
    ...extra,
  };
}

/** A deterministic `YYYY-MM-DD`, oldest first for index 0. */
function dayAt(index: number): string {
  return new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
}

function logOfDays(count: number): ReadingEntry[] {
  return Array.from({ length: count }, (_, index) =>
    entry(dayAt(index), index + 1),
  );
}

describe('appendReading', () => {
  it('appends a new day at the front', () => {
    const older = entry('2026-10-31', 5);
    const newer = entry(DAY, 9);

    expect(appendReading([older], newer)).toEqual([newer, older]);
  });

  it('replaces the same day instead of duplicating it', () => {
    const first = entry(DAY, 5, { at: 1 });
    const second = entry(DAY, 9, { at: 2, readPages: [9] });
    const log = appendReading(appendReading([], first), second);

    expect(log).toHaveLength(1);
    expect(resumeEntry(log)).toMatchObject({ page: 9, at: 2 });
    expect(log[0].readPages).toEqual([5, 9]);
  });

  it('dedupes pages within a day', () => {
    let log = appendReading([], entry(DAY, 5));
    log = appendReading(log, entry(DAY, 5));
    log = appendReading(log, entry(DAY, 7));
    log = appendReading(log, entry(DAY, 5));

    expect(pagesOn(log, DAY)).toBe(2);
    expect(log[0].readPages).toEqual([5, 7]);
  });

  it('caps the log at 366 days', () => {
    const log = logOfDays(380).reduce<ReadingEntry[]>(
      (current, next) => appendReading(current, next),
      [],
    );

    expect(log).toHaveLength(366);
    expect(log[0].day).toBe(dayAt(379));
    expect(log[log.length - 1].day).toBe(dayAt(14));
    expect(log.some((item) => item.day === dayAt(0))).toBe(false);
  });
});

describe('previousEntries', () => {
  it('returns at most three and never the resume', () => {
    const log = logOfDays(6).reverse();

    expect(previousEntries(log).map((item) => item.day)).toEqual([
      dayAt(4),
      dayAt(3),
      dayAt(2),
    ]);
    expect(previousEntries(log)).not.toContain(log[0]);
    expect(previousEntries(log, 1)).toHaveLength(1);
  });
});

describe('hizbProgress', () => {
  it('clamps read to the target', () => {
    const log = [
      entry(DAY, 12, {
        readPages: Array.from({ length: 12 }, (_, index) => index + 1),
      }),
    ];

    expect(pagesOn(log, DAY)).toBe(12);
    expect(hizbProgress(log, DAY, 10)).toEqual({
      read: 10,
      target: 10,
      done: true,
    });
  });

  it('is done at exactly the target', () => {
    const log = [
      entry(DAY, 10, {
        readPages: Array.from({ length: 10 }, (_, index) => index + 1),
      }),
    ];

    expect(hizbProgress(log, DAY, 10)).toEqual({
      read: 10,
      target: 10,
      done: true,
    });
  });
});
