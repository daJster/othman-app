import { useTranslation } from 'react-i18next';
import { Alert, Platform, type ViewProps } from 'react-native';
import { LANGUAGES, type Language } from '@/i18n';
import { useLanguage } from '@/providers/language-provider';
import { SegmentedControl } from '@/ui/segmented-control';

/**
 * Language choice for the Account preferences section.
 *
 * Switching is immediate — strings, direction and the `rtl:` variants update in
 * place. `I18nManager` is read at process start, so native text fields, switches
 * and alert button order keep the old direction until relaunch; that limitation
 * is surfaced, not hidden, and only on native.
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
