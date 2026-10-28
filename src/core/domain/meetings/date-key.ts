import type { DateKey } from '../../types';

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Format a `Date` as a local-time day key.
 *
 * Uses the local calendar parts on purpose — `toISOString().slice(0, 10)` would
 * shift the day for anyone west of UTC in the evening.
 */
export function formatDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}` as DateKey;
}

/** True for a real `YYYY-MM-DD` day (rejects `2026-02-30`, `2026-4-2`, …). */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false;

  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  return (
    parsed.getFullYear() === Number(year) &&
    parsed.getMonth() === Number(month) - 1 &&
    parsed.getDate() === Number(day)
  );
}

/**
 * Parse a day key back into a **local** noon `Date`.
 *
 * Noon, not midnight: it keeps the value on the intended day through any
 * reasonable timezone conversion and DST transition, which matters as soon as
 * the key is handed to a calendar or an `Intl` formatter.
 */
export function parseDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}
