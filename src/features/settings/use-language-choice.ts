import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native';
import type { Language } from '@/i18n';
import { useLanguage } from '@/providers/language-provider';

/**
 * Language selection with the native restart prompt.
 *
 * Shared by the settings row and the web nav menu. `I18nManager` only applies a
 * direction change after a relaunch on native, so every entry point has to ask
 * the same question — two copies would eventually disagree about when to warn.
 */
export function useLanguageChoice() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const select = useCallback(
    async (next: Language) => {
      const { restartRequired } = await setLanguage(next);

      if (!restartRequired || Platform.OS === 'web') return;

      Alert.alert(t('language.restartTitle'), t('language.restartMessage'), [
        { text: t('action.close') },
      ]);
    },
    [setLanguage, t],
  );

  return { language, select };
}
