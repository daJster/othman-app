import {
  HIJRI_MAX_YEAR,
  HIJRI_MIN_YEAR,
  epochDayToHijri,
  gregorianDateToHijri,
  hijriMonthLength,
  hijriToEpochDay,
  hijriToGregorianDate,
  hijriYearLength,
} from '@/core/utils/hijri';

/**
 * Known Umm al-Qura dates. These are the guard rails: the arithmetic/tabular
 * Islamic calendar disagrees with at least one of them by a day, which is
 * exactly the bug this table exists to prevent.
 */
describe('Hijri conversion', () => {
  it('converts known Umm al-Qura dates', () => {
    expect(gregorianDateToHijri(new Date(2024, 2, 11, 12))).toEqual({
      year: 1445,
      month: 9,
      day: 1,
    });
    expect(gregorianDateToHijri(new Date(2024, 3, 10, 12))).toEqual({
      year: 1445,
      month: 10,
      day: 1,
    });
    expect(gregorianDateToHijri(new Date(2025, 5, 26, 12))).toEqual({
      year: 1447,
      month: 1,
      day: 1,
    });
    expect(gregorianDateToHijri(new Date(1979, 10, 21, 12))).toEqual({
      year: 1400,
      month: 1,
      day: 1,
    });
  });

  it('converts back to the same Gregorian day', () => {
    const date = new Date(2026, 3, 2, 12);
    const hijri = gregorianDateToHijri(date);
    const back = hijriToGregorianDate(hijri);

    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(3);
    expect(back.getDate()).toBe(2);
  });

  it('round-trips every day for two Hijri years', () => {
    let epochDay = hijriToEpochDay({ year: 1445, month: 1, day: 1 });
    const end = hijriToEpochDay({ year: 1447, month: 1, day: 1 });

    while (epochDay < end) {
      const hijri = epochDayToHijri(epochDay);
      expect(hijriToEpochDay(hijri)).toBe(epochDay);
      epochDay++;
    }
  });

  it('keeps every month at 29 or 30 days and every year at 354 or 355', () => {
    for (let year = 1440; year <= 1450; year++) {
      let total = 0;

      for (let month = 1; month <= 12; month++) {
        const length = hijriMonthLength(year, month);
        expect([29, 30]).toContain(length);
        total += length;
      }

      expect(total).toBe(hijriYearLength(year));
      expect([354, 355]).toContain(total);
    }
  });

  it('rejects dates outside the supported table', () => {
    expect(() => gregorianDateToHijri(new Date(1900, 0, 1, 12))).toThrow(
      RangeError,
    );
    expect(() =>
      hijriToGregorianDate({ year: HIJRI_MIN_YEAR - 1, month: 1, day: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      hijriToGregorianDate({ year: HIJRI_MAX_YEAR + 1, month: 1, day: 1 }),
    ).toThrow(RangeError);
  });

  it('rejects an impossible day for the month', () => {
    // Muharram 1445 has 29 days in the Umm al-Qura table.
    expect(hijriMonthLength(1445, 1)).toBe(29);
    expect(() =>
      hijriToGregorianDate({ year: 1445, month: 1, day: 30 }),
    ).toThrow(RangeError);
  });
});
