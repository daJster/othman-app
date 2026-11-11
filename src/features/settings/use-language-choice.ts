import { useCallback } from 'react';
import type { Language } from '@/i18n';
import { useLanguage } from '@/providers/language-provider';

/**
 * Language selection.
 *
 * Shared by the settings row and the web nav menu. The switch is instant on
 * every platform: the app keeps one physical layout for both languages, so
 * there is no native flag to apply and nothing to warn about. There used to be
 * a restart prompt here — it existed only because `I18nManager.forceRTL` is
 * read at launch.
 */
export function useLanguageChoice() {
  const { language, setLanguage } = useLanguage();

  const select = useCallback(
    async (next: Language) => {
      await setLanguage(next);
    },
    [setLanguage],
  );

  return { language, select };
}
