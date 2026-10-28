import {
  formatDateKey,
  isDateKey,
  parseDateKey,
} from '@/core/domain/meetings/date-key';

describe('formatDateKey', () => {
  it('zero-pads the month and the day', () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('stays on the local day at both ends of it', () => {
    // The point of using local calendar parts: `toISOString()` would move the
    // 00:30 value to the previous day anywhere east of UTC, and the 23:30 value
    // to the next day anywhere west of it. A meeting must not drift a day just
    // because the device is not on UTC.
    expect(formatDateKey(new Date(2026, 3, 2, 0, 30))).toBe('2026-04-02');
    expect(formatDateKey(new Date(2026, 3, 2, 23, 30))).toBe('2026-04-02');
  });
});

describe('isDateKey', () => {
  it('accepts real calendar days', () => {
    expect(isDateKey('2026-04-02')).toBe(true);
    expect(isDateKey('2024-02-29')).toBe(true);
  });

  it('rejects non-days and non-strings', () => {
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('2025-02-29')).toBe(false);
    expect(isDateKey('2026-4-2')).toBe(false);
    expect(isDateKey('2026-04-02T00:00:00Z')).toBe(false);
    expect(isDateKey('')).toBe(false);
    expect(isDateKey(20260402)).toBe(false);
    expect(isDateKey(null)).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
  });
});

describe('parseDateKey', () => {
  it('produces local noon, so the day survives a timezone shift', () => {
    const date = parseDateKey('2026-04-02');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(2);
    expect(date.getHours()).toBe(12);
  });

  it('round-trips through formatDateKey', () => {
    const key = '2026-11-09';

    expect(formatDateKey(parseDateKey(key))).toBe(key);
  });
});
