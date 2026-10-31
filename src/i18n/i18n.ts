import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import ar from './locales/ar/common.json';
import en from './locales/en/common.json';
import { DEFAULT_LANGUAGE, isLanguage, type Language } from './languages';

/**
 * Device language, narrowed to the supported set.
 *
 * `expo-localization` is used for detection only. It is not the source of
 * truth: the stored preference wins, and this is just what the very first
 * frame uses before storage answers. Reading a locale can throw on some web
 * runtimes (and during static rendering there is no locale at all), so the
 * fallback is unconditional rather than optimistic.
 */
export function detectDeviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode;
    return isLanguage(code) ? code : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export const resources = {
  ar: { common: ar },
  en: { common: en },
} as const;

/**
 * A single instance, initialised at module scope.
 *
 * Locales are bundled, so `initAsync: false` makes initialisation synchronous —
 * no render ever happens against an empty resource store, which would flash raw
 * keys. The language here is the *device* guess; the provider re-applies the
 * stored preference during boot, before the splash lifts.
 */
// `.use()` is i18next's plugin registration. `use` is also a standalone named
// export, which is exactly what the rule warns about — not a mistake here.
// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ['ar', 'en'],
  initAsync: false,
  ns: ['common'],
  defaultNS: 'common',
  interpolation: {
    // React escapes on render; escaping here would print `&amp;`.
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
