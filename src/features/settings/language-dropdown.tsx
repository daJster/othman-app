import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native';
import { LANGUAGES, type Language } from '@/i18n';
import { useLanguage } from '@/providers/language-provider';
import { SettingsDropdown } from './settings-dropdown';
import type { SettingsDropdownVariant } from './settings-dropdown.types';

/**
 * Language choice, shared by the navbar and the settings surfaces.
 *
 * Switching is immediate; on native, `I18nManager` only fully applies after a
 * relaunch, so the user is told when that is required.
 */
export type LanguageDropdownProps = {
  variant?: SettingsDropdownVariant;
  className?: string;
  testID?: string;
};

export function LanguageDropdown({
  variant = 'row',
  className,
  testID = 'language-dropdown',
}: LanguageDropdownProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const handleChange = async (next: Language) => {
    const { restartRequired } = await setLanguage(next);

    if (!restartRequired || Platform.OS === 'web') return;

    Alert.alert(t('language.restartTitle'), t('language.restartMessage'), [
      { text: t('action.close') },
    ]);
  };

  return (
    <SettingsDropdown
      label={t('language.title')}
      value={language}
      options={LANGUAGES.map(({ code, labelKey }) => ({
        value: code,
        label: t(labelKey),
        shortLabel:
          code === 'ar' ? t('language.arShort') : t('language.enShort'),
      }))}
      onChange={(next) => void handleChange(next)}
      variant={variant}
      className={className}
      testID={testID}
    />
  );
}
