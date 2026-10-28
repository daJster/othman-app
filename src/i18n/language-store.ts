import i18n from './i18n';
import { DEFAULT_LANGUAGE, isLanguage, type Language } from './languages';

/**
 * Language state outside React.
 *
 * Direction has to be readable from the very top of the tree (`LayoutDirection`
 * wraps everything, including the theme provider), which a React context cannot
 * do without putting a provider above itself. A tiny external store solved with
 * `useSyncExternalStore` keeps a single source of truth without inverting the
 * component tree.
 *
 * `ready` exists for the same reason as the theme's: the splash must outlast it
 * so the first visible frame is already in the stored language.
 */
export type LanguageState = {
  readonly language: Language;
  readonly ready: boolean;
};

const initialLanguage: Language = isLanguage(i18n.language)
  ? i18n.language
  : DEFAULT_LANGUAGE;

let state: LanguageState = { language: initialLanguage, ready: false };

const listeners = new Set<() => void>();

export function getLanguageState(): LanguageState {
  return state;
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLanguageState(next: LanguageState): void {
  if (next.language === state.language && next.ready === state.ready) return;

  state = next;
  for (const listener of listeners) listener();
}
