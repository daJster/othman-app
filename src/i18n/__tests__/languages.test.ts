import { DEFAULT_LANGUAGE, LANGUAGES } from '@/i18n/languages';

/**
 * The language set is part of the product contract: Arabic is the default and
 * English is the only second language.
 */
describe('languages', () => {
  it('defaults to Arabic', () => {
    expect(DEFAULT_LANGUAGE).toBe('ar');
  });

  it('offers Arabic first and English second, with no third option', () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual(['ar', 'en']);
  });
});
