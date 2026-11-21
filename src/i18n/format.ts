import type { Language } from './languages';

/**
 * App-wide numeric display rule.
 *
 * Arabic copy keeps its words, calendar names and meridiem, but every digit is
 * the Latin `0–9` form. Locale extensions are the one place this can be pinned:
 * `Intl` otherwise selects Arabic-Indic digits for `ar` on many devices.
 */
export const NUMBER_LOCALE: Readonly<Record<Language, string>> = {
  ar: 'ar-EG-u-nu-latn',
  en: 'en-u-nu-latn',
};

export function numberLocale(language: Language): string {
  return NUMBER_LOCALE[language];
}
