import { ApiError } from './errors.ts';
import type { DateKey } from '../contracts.ts';

/**
 * Boundary validation.
 *
 * Handlers receive `unknown` from HTTP/JSON and must not trust it. These helpers
 * either return a typed value or throw `invalid-argument`, so a handler body can
 * stay linear instead of nesting a guard per field.
 */

export type JsonObject = Record<string, unknown>;

export function asObject(value: unknown, label = 'body'): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw ApiError.invalid(`${label} must be an object`);
  }

  return value as JsonObject;
}

type StringOptions = {
  min?: number;
  max?: number;
  trim?: boolean;
};

export function requiredString(
  object: JsonObject,
  key: string,
  options: StringOptions = {},
): string {
  const value = object[key];

  if (typeof value !== 'string') {
    throw ApiError.invalid(`"${key}" must be a string`);
  }

  const text = options.trim === false ? value : value.trim();
  const min = options.min ?? 1;
  const max = options.max ?? 10_000;

  if (text.length < min || text.length > max) {
    throw ApiError.invalid(`"${key}" must be ${min}-${max} characters`);
  }

  return text;
}

export function optionalString(
  object: JsonObject,
  key: string,
  options: StringOptions = {},
): string | undefined {
  const value = object[key];
  if (value === undefined || value === null) return undefined;

  return requiredString(object, key, options);
}

export function optionalNullableString(
  object: JsonObject,
  key: string,
  options: StringOptions = {},
): string | null | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (value === null) return null;

  return requiredString(object, key, options);
}

export function requiredInteger(
  object: JsonObject,
  key: string,
  options: { min?: number; max?: number } = {},
): number {
  const value = object[key];

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw ApiError.invalid(`"${key}" must be an integer`);
  }

  return inRange(value, key, options);
}

export function optionalInteger(
  object: JsonObject,
  key: string,
  options: { min?: number; max?: number } = {},
): number | undefined {
  if (object[key] === undefined || object[key] === null) return undefined;

  return requiredInteger(object, key, options);
}

export function requiredNumber(
  object: JsonObject,
  key: string,
  options: { min?: number; max?: number } = {},
): number {
  const value = object[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw ApiError.invalid(`"${key}" must be a number`);
  }

  return inRange(value, key, options);
}

export function optionalNumber(
  object: JsonObject,
  key: string,
  options: { min?: number; max?: number } = {},
): number | undefined {
  if (object[key] === undefined || object[key] === null) return undefined;

  return requiredNumber(object, key, options);
}

function inRange(
  value: number,
  key: string,
  { min, max }: { min?: number; max?: number },
): number {
  if (min !== undefined && value < min) {
    throw ApiError.invalid(`"${key}" must be >= ${min}`);
  }

  if (max !== undefined && value > max) {
    throw ApiError.invalid(`"${key}" must be <= ${max}`);
  }

  return value;
}

export function optionalBoolean(
  object: JsonObject,
  key: string,
): boolean | undefined {
  const value = object[key];
  if (value === undefined || value === null) return undefined;

  if (typeof value !== 'boolean') {
    throw ApiError.invalid(`"${key}" must be a boolean`);
  }

  return value;
}

export function optionalEnum<T extends string>(
  object: JsonObject,
  key: string,
  values: readonly T[],
): T | undefined {
  const value = object[key];
  if (value === undefined || value === null) return undefined;

  const match = values.find((candidate) => candidate === value);

  if (!match) {
    throw ApiError.invalid(`"${key}" must be one of: ${values.join(', ')}`);
  }

  return match;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requiredEmail(object: JsonObject, key = 'email'): string {
  const email = requiredString(object, key, { max: 254 }).toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw ApiError.invalid(`"${key}" must be a valid email address`);
  }

  return email;
}

export function requiredPassword(object: JsonObject, key = 'password'): string {
  const password = requiredString(object, key, { min: 8, max: 128 });

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw ApiError.invalid(
      `"${key}" must be at least 8 characters and include a letter and a digit`,
    );
  }

  return password;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

export function requiredDateKey(object: JsonObject, key: string): DateKey {
  const value = object[key];

  if (!isDateKey(value)) {
    throw ApiError.invalid(`"${key}" must be a YYYY-MM-DD day`);
  }

  return value;
}

const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function requiredClock(object: JsonObject, key: string): string {
  const value = object[key];

  if (typeof value !== 'string' || !CLOCK_PATTERN.test(value)) {
    throw ApiError.invalid(`"${key}" must be a HH:mm clock reading`);
  }

  return value;
}

export function parseId(value: string | number, label = 'id'): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw ApiError.invalid(`"${label}" must be a positive integer`);
  }

  return parsed;
}

export function parseLimit(
  query: Record<string, string>,
  fallback = 50,
  max = 200,
): number {
  const raw = query.limit;
  if (raw === undefined) return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw ApiError.invalid('"limit" must be a positive integer');
  }

  return Math.min(parsed, max);
}

export function parseOffset(query: Record<string, string>): number {
  const raw = query.offset;
  if (raw === undefined) return 0;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw ApiError.invalid('"offset" must be a non-negative integer');
  }

  return parsed;
}

/** Copies only defined keys, so a PATCH never writes `undefined` over a value. */
export function definedOnly<T extends Record<string, unknown>>(
  object: T,
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}
