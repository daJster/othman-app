import { ListItem } from '@expo/ui';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { SettingsRow } from '@/features/account/settings-row';
import { useThemeMode } from '@/providers/theme-provider';
import { Icon } from '@/ui/icon';
import { useLanguageChoice } from './use-language-choice';

/**
 * The two preferences, as rows that state their current value.
 *
 * Theme used to be a three-segment control with a permanently visible
 * explanation under it, and language a filled dropdown card — three different
 * row grammars on a screen where every other line is a native list row. Both
 * are set-once choices, so the page only has to answer "what is it now?" and
 * open the chooser. The value sits in the supporting line on iOS/Android (the
 * platform's own secondary style) and in the description on web.
 *
 * The choosers are sheets (`preferences-sheets.tsx`); this component owns the
 * rows, not the overlay, so the screen keeps one place for open state.
 */
export type PreferencesSectionProps = {
  onAppearance: () => void;
  onLanguage: () => void;
};

export function PreferencesSection({
  onAppearance,
  onLanguage,
}: PreferencesSectionProps) {
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const { language } = useLanguageChoice();

  const appearance = t(`theme.${mode}`);
  const languageName =
    language === 'ar' ? t('language.arabic') : t('language.english');

  if (Platform.OS === 'web') {
    return (
      <>
        <SettingsRow
          testID="account-appearance-row"
          icon="palette"
          label={t('theme.title')}
          description={appearance}
          onPress={onAppearance}
        />

        <SettingsRow
          testID="account-language-row"
          icon="languages"
          label={t('language.title')}
          description={languageName}
          onPress={onLanguage}
          last
        />
      </>
    );
  }

  return (
    <>
      <ListItem
        testID="account-appearance-row"
        leading={<Icon name="palette" />}
        supportingText={appearance}
        trailing={<Icon name="chevron-right" tone="muted" />}
        onPress={onAppearance}
      >
        {t('theme.title')}
      </ListItem>

      <ListItem
        testID="account-language-row"
        leading={<Icon name="languages" />}
        supportingText={languageName}
        trailing={<Icon name="chevron-right" tone="muted" />}
        onPress={onLanguage}
      >
        {t('language.title')}
      </ListItem>
    </>
  );
}
