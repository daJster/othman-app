import type { DateKey } from '../../types';
import { isDateKey } from '../meetings/date-key';

/**
 * Runtime checks for payloads that cross the network.
 *
 * TypeScript describes what the app *expects* a response to be; these guards
 * check what actually arrived. Each one names the path of the field it rejected,
 * so a broken payload fails with `meetings[2].durationMinutes` rather than an
 * `undefined` three components away. They are strict about type and accept any
 * value of the right type unchanged.
 *
 * Pure, with no platform imports, so the same rules run in core tests.
 */

export class WireShapeError extends Error {
  readonly path: string;
  readonly expected: string;

  constructor(path: string, expected: string) {
    super(`Unexpected response at ${path || 'root'}: expected ${expected}`);
    this.name = 'WireShapeError';
    this.path = path;
    this.expected = expected;
  }
}

/** A parser turns an unknown value into a typed one, or throws `WireShapeError`. */
export type Parser<T> = (value: unknown, path: string) => T;

/** Joins a field name or array index onto a path. */
export function at(path: string, key: string | number): string {
  if (typeof key === 'number') return `${path}[${key}]`;

  return path === '' ? key : `${path}.${key}`;
}

export function asRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new WireShapeError(path, 'an object');
  }

  return value as Record<string, unknown>;
}

export function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new WireShapeError(path, 'an array');

  return value;
}

export function asString(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new WireShapeError(path, 'a string');

  return value;
}

export function asFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new WireShapeError(path, 'a finite number');
  }

  return value;
}

export function asInteger(
  value: unknown,
  path: string,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
): number {
  const number = asFiniteNumber(value, path);

  if (!Number.isInteger(number) || number < min || number > max) {
    throw new WireShapeError(path, `an integer from ${min} to ${max}`);
  }

  return number;
}

export function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new WireShapeError(path, 'a boolean');

  return value;
}

export function asDateKey(value: unknown, path: string): DateKey {
  const text = asString(value, path);

  if (!isDateKey(text)) throw new WireShapeError(path, 'a YYYY-MM-DD day');

  return text;
}

export function asOneOf<T extends string>(options: readonly T[]): Parser<T> {
  return (value, path) => {
    if (
      typeof value !== 'string' ||
      !(options as readonly string[]).includes(value)
    ) {
      throw new WireShapeError(
        path,
        options.map((option) => `"${option}"`).join(' | '),
      );
    }

    return value as T;
  };
}

/** `null` passes through; anything else must satisfy `parse`. */
export function nullable<T>(parse: Parser<T>): Parser<T | null> {
  return (value, path) => (value === null ? null : parse(value, path));
}

/**
 * Like `nullable`, but an absent field reads as `null`. The mock server omits
 * some optional fields instead of sending `null`, and both mean "no value".
 */
export function missingAsNull<T>(parse: Parser<T>): Parser<T | null> {
  return (value, path) =>
    value === undefined || value === null ? null : parse(value, path);
}

/** `undefined` passes through; anything else must satisfy `parse`. */
export function optional<T>(parse: Parser<T>): Parser<T | undefined> {
  return (value, path) =>
    value === undefined ? undefined : parse(value, path);
}

export function array<T>(parse: Parser<T>): Parser<T[]> {
  return (value, path) =>
    asArray(value, path).map((item, index) => parse(item, at(path, index)));
}
