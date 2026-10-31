import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/localStorage';

export const LANGUAGES = [
    { code: 'ar', label: 'عربية' },
    { code: 'en', label: 'English' },
];
const DEFAULT_LANG = 'en';

const getInitialLanguage = (): string => {
    const stored = getItem<string>(STORAGE_KEYS.LANGUAGE, '');
    if (stored && LANGUAGES.some((l) => l.code === stored)) {
        return stored;
    }
    return DEFAULT_LANG;
};

const setLanguage = (lang: string): void => {
    setItem(STORAGE_KEYS.LANGUAGE, lang);
};

i18n.use(initReactI18next).init({
    resources: {
        en: { common: enCommon },
        ar: { common: arCommon },
    },
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANG, //
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
        escapeValue: false,
    },
    detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: STORAGE_KEYS.LANGUAGE,
    },
});

// Set initial direction on page load
const initialLang = getInitialLanguage();
const initialDir = initialLang === DEFAULT_LANG ? 'ltr' : 'rtl';
document.documentElement.dir = initialDir;
document.documentElement.lang = initialLang;

// Listen for language changes to update the document direction (RTL/LTR)
i18n.on('languageChanged', (lng) => {
    setLanguage(lng);
    const dir = lng === DEFAULT_LANG ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
});

export default i18n;
