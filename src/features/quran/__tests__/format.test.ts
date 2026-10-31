import { formatReaderNumber } from '../format';

/**
 * The reader prints numbers in three places (header, footer, picker). They all
 * go through one `Intl` formatter so Arabic gets the reader's locale rather
 * than whatever the device happened to be set to at build time.
 */
describe('formatReaderNumber', () => {
  it('formats with the requested locale, not the device locale', () => {
    expect(formatReaderNumber(604, 'en')).toBe(
      new Intl.NumberFormat('en').format(604),
    );
    expect(formatReaderNumber(604, 'ar')).toBe(
      new Intl.NumberFormat('ar').format(604),
    );
  });

  it('never returns an empty string for a real position', () => {
    expect(formatReaderNumber(1, 'ar').length).toBeGreaterThan(0);
    expect(formatReaderNumber(604, 'en').length).toBeGreaterThan(0);
  });
});
