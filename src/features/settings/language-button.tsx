import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native';
import { useLanguage } from '@/providers/language-provider';
import { Text } from '@/ui/text';
import { SettingsButton } from './settings-button';

/**
 * Navbar language control.
 *
 * The code shows the language currently in effect (`ع` or `EN`); tapping
 * switches to the other one. On native the direction change is immediate but
 * `I18nManager` only fully applies after a relaunch, so the user is told.
 */
export function LanguageButton() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const currentLabel =
    language === 'ar' ? t('language.arabic') : t('language.english');
  const next = language === 'ar' ? 'en' : 'ar';

  const handlePress = async () => {
    const { restartRequired } = await setLanguage(next);

    if (!restartRequired || Platform.OS === 'web') return;

    Alert.alert(t('language.restartTitle'), t('language.restartMessage'), [
      { text: t('action.close') },
    ]);
  };

  return (
    <SettingsButton
      testID="nav-language-toggle"
      label={`${t('nav.toggleLanguage')}: ${currentLabel}`}
      onPress={() => void handlePress()}
    >
      <Text variant="label" className="text-base font-semibold" tone="muted">
        {language === 'ar' ? 'ع' : 'EN'}
      </Text>
    </SettingsButton>
  );
}
