import { formatReaderNumber } from '../format';

/**
 * The reader prints numbers in three places (header, footer, picker). They all
 * go through the shared number locale, which keeps digits Latin in both
 * languages so Arabic copy never falls back to Arabic-Indic numerals.
 */
describe('formatReaderNumber', () => {
  it('formats with the app digit policy, not the device locale', () => {
    expect(formatReaderNumber(604, 'en')).toBe('604');
    expect(formatReaderNumber(604, 'ar')).toBe('604');
  });

  it('never returns an empty string for a real position', () => {
    expect(formatReaderNumber(1, 'ar').length).toBeGreaterThan(0);
    expect(formatReaderNumber(604, 'en').length).toBeGreaterThan(0);
  });
});
