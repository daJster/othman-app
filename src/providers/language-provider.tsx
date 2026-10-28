import { useEffect, type ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import {
  directionOf,
  getLanguageState,
  i18n,
  isLanguage,
  isRTLLanguage,
  setLanguageState,
  useLanguageState,
  type Direction,
  type Language,
} from '@/i18n';
import { STORAGE_KEYS, storageService } from '@/platform/storage';

/**
 * Language state.
 *
 * The i18next instance is initialised at module scope with the device language,
 * so `t()` works in any component with no provider. This provider owns the
 * three things the instance cannot do by itself:
 *
 *  1. reconcile the *stored* preference, which is async, before the splash
 *     lifts (exposed as `ready`);
 *  2. keep the native RTL flag in sync (`I18nManager`), which is a persisted
 *     native flag and therefore only fully applies on the next launch;
 *  3. keep `<html lang dir>` correct on web.
 *
 * Changing the language is not a provider method: `setLanguage` is a module
 * function because it must also be callable from outside React (boot, tests,
 * deep links), and there is exactly one language for the whole app.
 */

export type LanguageContextValue = {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  /** False until the stored language has been reconciled with storage. */
  ready: boolean;
  setLanguage: (language: Language) => Promise<{ restartRequired: boolean }>;
};

/**
 * Native direction.
 *
 * `I18nManager` is the only thing that flips React Native's own primitives —
 * text-input alignment, switch thumbs, alert button order. Uniwind's
 * `LayoutDirection` covers className variants and logical utilities, but it
 * cannot move a native control. `forceRTL` writes a flag the next process reads,
 * so a change is reported back to the caller to prompt for a restart. Nothing
 * here runs on web: the browser owns direction through `<html dir>`.
 */
function applyNativeDirection(language: Language): {
  restartRequired: boolean;
} {
  if (Platform.OS === 'web') return { restartRequired: false };

  const rtl = isRTLLanguage(language);
  I18nManager.allowRTL(true);

  const restartRequired = I18nManager.isRTL !== rtl;
  if (restartRequired) I18nManager.forceRTL(rtl);

  return { restartRequired };
}

/** Web only: keep the document in step with the app. Guarded because Expo web
 * statically renders in Node, where `document` does not exist. */
function syncDocument(language: Language): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  document.documentElement.lang = language;
  document.documentElement.dir = directionOf(language);
}

export async function setLanguage(
  language: Language,
): Promise<{ restartRequired: boolean }> {
  if (language === getLanguageState().language) {
    return { restartRequired: false };
  }

  const { restartRequired } = applyNativeDirection(language);

  // Awaited so the state update below cannot produce a render in which
  // `language` says `ar` but `t()` still returns English strings.
  await i18n.changeLanguage(language);

  syncDocument(language);
  setLanguageState({ language, ready: true });

  // Persistence is fire-and-forget: the switch is already visible, and a failed
  // write is not a reason to refuse it. The next boot falls back to detection.
  void storageService.setItem(STORAGE_KEYS.language, language);

  return { restartRequired };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { language, ready } = useLanguage();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored: unknown = await storageService.getItem(
        STORAGE_KEYS.language,
        null,
      );
      if (cancelled) return;

      const next = isLanguage(stored) ? stored : getLanguageState().language;

      // Written on every boot, so the native flag always ends up matching the
      // language actually in use — including a switch that was interrupted
      // before its restart. The current process keeps the flag it booted with.
      applyNativeDirection(next);

      // Only await when it actually changes: on the common path the instance
      // already holds the detected language, and `changeLanguage` would emit a
      // pointless `languageChanged` event for every listener.
      if (i18n.language !== next) await i18n.changeLanguage(next);
      if (cancelled) return;

      syncDocument(next);
      setLanguageState({ language: next, ready: true });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // A language change after hydration (not during it) must also reach the DOM.
  useEffect(() => {
    if (!ready) return;

    syncDocument(language);
  }, [language, ready]);

  return children;
}

export function useLanguage(): LanguageContextValue {
  const state = useLanguageState();

  return {
    language: state.language,
    direction: directionOf(state.language),
    isRTL: isRTLLanguage(state.language),
    ready: state.ready,
    setLanguage,
  };
}
