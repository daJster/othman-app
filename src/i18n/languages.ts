/**
 * Languages and direction.
 *
 * The two supported languages are a closed set, so this is a table rather than
 * a runtime registry: `Language` is derived from it, and adding a third entry
 * is the only way to widen the type. Direction is a property of the language,
 * not a separate piece of state, which is why it lives here instead of in the
 * provider.
 */

export const LANGUAGES = [
  { code: 'ar', labelKey: 'language.arabic', dir: 'rtl' },
  { code: 'en', labelKey: 'language.english', dir: 'ltr' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

export type Direction = (typeof LANGUAGES)[number]['dir'];

/**
 * Arabic is the product default on first launch. English is the second
 * language and is only ever used after an explicit choice; the stored
 * preference always wins once it exists.
 */
export const DEFAULT_LANGUAGE: Language = 'ar';

const LANGUAGE_CODES = LANGUAGES.map(
  (language) => language.code,
) as readonly string[];

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGE_CODES.includes(value);
}

export function directionOf(language: Language): Direction {
  return language === 'ar' ? 'rtl' : 'ltr';
}

export function isRTLLanguage(language: Language): boolean {
  return directionOf(language) === 'rtl';
}
