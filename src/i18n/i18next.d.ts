import type en from './locales/en/common.json';

/**
 * Typed translation keys.
 *
 * `en` is the source of truth: every `t('…')` call is checked against it, so a
 * typo or a key removed from the locale is a compile error rather than a
 * runtime string of raw dots. The audit script (`scripts/i18n-audit.mjs`)
 * covers the other half — that `ar` has the same keys.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof en;
    };
  }
}
