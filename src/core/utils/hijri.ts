/**
 * Umm al-Qura Hijri calendar.
 *
 * The meetings calendar offers a Hijri view, and a Hijri date that is one day
 * off is not a cosmetic bug: it sends the user to the wrong day's meetings.
 * The conversion therefore uses the **Umm al-Qura** month-length table (the
 * calendar Saudi Arabia uses, and the one ICU/CLDR ships) rather than the
 * arithmetic/tabular Islamic calendar, which drifts by a day or two.
 *
 * `YEAR_MASKS` was generated from Node's ICU data with
 * `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`: one 12-bit mask per Hijri
 * year, bit `12 - month` set when that month has 30 days. Generating it once
 * keeps runtime behaviour identical on every engine — Hermes' `Intl` calendar
 * support differs between iOS and Android, so asking the device to convert
 * would make the same meeting land on different days per platform.
 *
 * The supported range is wider than what the UI navigates (1400–1500) so a
 * 42-cell grid can include the few days before/after the first/last month.
 * Dates outside it throw a `RangeError`; callers that render a grid catch it.
 *
 * All maths is done on **epoch days** (days since 1970-01-01, UTC). A
 * `Date` is only used at the boundary, and its *local* calendar parts are what
 * count: the user's "2 April" is the day they see, regardless of timezone.
 */

const MS_PER_DAY = 86_400_000;
const MONTHS_PER_YEAR = 12;

const FIRST_HIJRI_YEAR = 1395;
const LAST_HIJRI_YEAR = 1510;

/** Epoch day of 1395-01-01 (1975-01-14). */
const EPOCH_DAY = 1839;

/**
 * One mask per Hijri year, 1395 → 1510 inclusive.
 * Bit `12 - month` is set when the month has 30 days; otherwise 29.
 */
const YEAR_MASKS = [
  0xb49, 0xb64, 0xb71, 0x5b4, 0xab5, 0xa55, 0xd25, 0xe92, 0xec9, 0x6d4, 0xae9,
  0x96b, 0x4ab, 0xa93, 0xd49, 0xda4, 0xdb2, 0xab9, 0x4ba, 0xa5b, 0x52b, 0xa95,
  0xb2a, 0xb55, 0x55c, 0x4bd, 0x23d, 0x91d, 0xa95, 0xb4a, 0xb5a, 0x56d, 0x2b6,
  0x93b, 0x49b, 0x655, 0x6a9, 0x754, 0xb6a, 0x56c, 0xaad, 0x555, 0xb29, 0xb92,
  0xba9, 0x5d4, 0xada, 0x55a, 0xaab, 0x595, 0x749, 0x764, 0xbaa, 0x5b5, 0x2b6,
  0xa56, 0xe4d, 0xb25, 0xb52, 0xb6a, 0x5ad, 0x2ae, 0x92f, 0x497, 0x64b, 0x6a5,
  0x6ac, 0xad6, 0x55d, 0x49d, 0xa4d, 0xd16, 0xd95, 0x5aa, 0x5b5, 0x2da, 0x95b,
  0x4ad, 0x595, 0x6ca, 0x6e4, 0xaea, 0x4f5, 0x2b6, 0x956, 0xaaa, 0xb54, 0xbd2,
  0x5d9, 0x2ea, 0x96d, 0x4ad, 0xa95, 0xb4a, 0xba5, 0x5b2, 0x9b5, 0x4d6, 0xa97,
  0x547, 0x693, 0x749, 0xb55, 0x56a, 0xa6b, 0x52b, 0xa8b, 0xd46, 0xda3, 0x5ca,
  0xad6, 0x4db, 0x26b, 0x94b, 0xaa5, 0xb52,
] as const;

export type HijriDate = {
  /** 1395–1510. */
  readonly year: number;
  /** 1–12, where 1 is Muharram. */
  readonly month: number;
  /** 1–30. */
  readonly day: number;
};

/** A Gregorian calendar date with a 1-based month. */
export type CivilDate = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
};

function isSupportedYear(year: number): boolean {
  return (
    Number.isInteger(year) &&
    year >= FIRST_HIJRI_YEAR &&
    year <= LAST_HIJRI_YEAR
  );
}

function assertYear(year: number): void {
  if (!isSupportedYear(year)) {
    throw new RangeError(
      `Hijri year ${year} is outside ${FIRST_HIJRI_YEAR}–${LAST_HIJRI_YEAR}`,
    );
  }
}

function assertMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > MONTHS_PER_YEAR) {
    throw new RangeError(`Hijri month ${month} is outside 1–12`);
  }
}

export function hijriMonthLength(year: number, month: number): 29 | 30 {
  assertYear(year);
  assertMonth(month);

  const mask = YEAR_MASKS[year - FIRST_HIJRI_YEAR];
  return (mask & (1 << (MONTHS_PER_YEAR - month))) !== 0 ? 30 : 29;
}

export function hijriYearLength(year: number): 354 | 355 {
  let length = 0;
  for (let month = 1; month <= MONTHS_PER_YEAR; month++) {
    length += hijriMonthLength(year, month);
  }
  return length as 354 | 355;
}

/** Epoch day of every Hijri month start, plus the day after the last month. */
const MONTH_STARTS: readonly number[] = (() => {
  const starts: number[] = [EPOCH_DAY];

  for (let year = FIRST_HIJRI_YEAR; year <= LAST_HIJRI_YEAR; year++) {
    for (let month = 1; month <= MONTHS_PER_YEAR; month++) {
      starts.push(starts[starts.length - 1] + hijriMonthLength(year, month));
    }
  }

  return starts;
})();

export const HIJRI_MIN_YEAR = FIRST_HIJRI_YEAR;
export const HIJRI_MAX_YEAR = LAST_HIJRI_YEAR;

export function civilDateToEpochDay(date: CivilDate): number {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / MS_PER_DAY);
}

export function epochDayToCivilDate(epochDay: number): CivilDate {
  const date = new Date(epochDay * MS_PER_DAY);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function hijriToEpochDay(date: HijriDate): number {
  assertYear(date.year);
  assertMonth(date.month);

  const length = hijriMonthLength(date.year, date.month);
  if (!Number.isInteger(date.day) || date.day < 1 || date.day > length) {
    throw new RangeError(
      `Hijri day ${date.day} is outside 1–${length} of ${date.year}-${date.month}`,
    );
  }

  const index =
    (date.year - FIRST_HIJRI_YEAR) * MONTHS_PER_YEAR + (date.month - 1);

  return MONTH_STARTS[index] + date.day - 1;
}

export function epochDayToHijri(epochDay: number): HijriDate {
  const lastStart = MONTH_STARTS[MONTH_STARTS.length - 1];
  if (
    !Number.isInteger(epochDay) ||
    epochDay < EPOCH_DAY ||
    epochDay >= lastStart
  ) {
    throw new RangeError(
      `Epoch day ${epochDay} is outside the supported Hijri range`,
    );
  }

  // Largest month start <= epochDay.
  let low = 0;
  let high = MONTH_STARTS.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (MONTH_STARTS[middle] <= epochDay) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  const year = FIRST_HIJRI_YEAR + Math.floor(low / MONTHS_PER_YEAR);
  const month = (low % MONTHS_PER_YEAR) + 1;

  return { year, month, day: epochDay - MONTH_STARTS[low] + 1 };
}

/** Convert the **local** calendar day of `date` to a Hijri date. */
export function gregorianDateToHijri(date: Date): HijriDate {
  return epochDayToHijri(
    civilDateToEpochDay({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    }),
  );
}

/**
 * Convert a Hijri date to a local **noon** `Date`.
 *
 * Noon avoids a midnight DST jump turning the date into the previous day when
 * it is later formatted or compared.
 */
export function hijriToGregorianDate(date: HijriDate): Date {
  const civil = epochDayToCivilDate(hijriToEpochDay(date));

  return new Date(civil.year, civil.month - 1, civil.day, 12, 0, 0, 0);
}

/** The Hijri month a local date falls in, or `null` outside the table. */
export function tryGregorianDateToHijri(date: Date): HijriDate | null {
  try {
    return gregorianDateToHijri(date);
  } catch {
    return null;
  }
}
