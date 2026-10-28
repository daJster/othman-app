import { useTranslation } from 'react-i18next';
import { Alert, Platform, type ViewProps } from 'react-native';
import { LANGUAGES, type Language } from '@/i18n';
import { useLanguage } from '@/providers/language-provider';
import { SegmentedControl } from './segmented-control';

/**
 * Language toggle.
 *
 * Switching is immediate — strings, direction and the `rtl:` variants all
 * update in place. What cannot update in place is React Native's own RTL flag
 * (`I18nManager`), which is read at process start: text-input alignment, switch
 * thumbs and native alert button order keep the old direction until relaunch.
 * That limitation is surfaced instead of hidden, and only on native.
 *
 * The prompt is informational. There is no "restart now" button because the app
 * ships without `expo-updates`, so there is no supported way to relaunch
 * programmatically; the honest action is to tell the user.
 */
export function LanguageToggle({ className, ...props }: ViewProps) {
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
    <SegmentedControl
      label={t('language.title')}
      value={language}
      options={LANGUAGES.map(({ code, labelKey }) => ({
        value: code,
        label: t(labelKey),
      }))}
      onChange={(next) => void handleChange(next)}
      className={className}
      {...props}
    />
  );
}
