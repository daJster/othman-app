import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar/common.json';
import en from './locales/en/common.json';
import { DEFAULT_LANGUAGE } from './languages';

/**
 * The i18n instance starts in Arabic, the product default, not the device
 * language. English is the second language and is only used after an explicit
 * choice; the stored preference is applied by `LanguageProvider` before the
 * splash lifts.
 */

export const resources = {
  ar: { common: ar },
  en: { common: en },
} as const;

/**
 * A single instance, initialised at module scope.
 *
 * Locales are bundled, so `initAsync: false` makes initialisation synchronous —
 * no render ever happens against an empty resource store, which would flash raw
 * keys. `DEFAULT_LANGUAGE` is Arabic; the provider re-applies the stored
 * preference during boot, before the splash lifts.
 */
// `.use()` is i18next's plugin registration. `use` is also a standalone named
// export, which is exactly what the rule warns about — not a mistake here.
// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
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
