import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Text } from '@/ui/text';
import { LanguageToggle } from './language-toggle';
import { ThemeToggle } from './theme-toggle';

/**
 * The shared preferences block.
 *
 * Rendered inside the Account list on every platform: a section header is
 * supplied by the screen, and this block owns the two labelled controls. The
 * web navbar exposes the same two settings as compact buttons.
 */
export function PreferencesSection() {
  const { t } = useTranslation();

  return (
    <View className="gap-4 px-4 py-3" testID="preferences-section">
      <View className="gap-1">
        <Text variant="label">{t('theme.title')}</Text>
        <ThemeToggle className="self-start" />
      </View>

      <View className="gap-1">
        <Text variant="label">{t('language.title')}</Text>
        <LanguageToggle className="self-start" />
      </View>
    </View>
  );
}
