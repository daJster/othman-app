import { useSyncExternalStore } from 'react';
import { getLanguageState, subscribeLanguage } from './language-store';
import {
  directionOf,
  isRTLLanguage,
  type Direction,
  type Language,
} from './languages';

/**
 * Read-only language hooks.
 *
 * They live in `src/i18n` rather than in the provider so that pure presentation
 * can read the direction without pulling the persistence stack in: the provider
 * imports `storageService`, and `Text` must not depend on AsyncStorage just to
 * choose a font. Nothing here writes; `setLanguage` is the provider's job.
 */
export function useLanguageState() {
  return useSyncExternalStore(
    subscribeLanguage,
    getLanguageState,
    getLanguageState,
  );
}

/**
 * Direction-only hook.
 *
 * `Text` and `LayoutDirection` need the direction and nothing else. `language`
 * rides along because a caller that switches on direction usually wants to
 * format dates and numbers for the same locale.
 */
export function useDirection(): {
  language: Language;
  direction: Direction;
  isRTL: boolean;
} {
  const { language } = useLanguageState();

  return {
    language,
    direction: directionOf(language),
    isRTL: isRTLLanguage(language),
  };
}
