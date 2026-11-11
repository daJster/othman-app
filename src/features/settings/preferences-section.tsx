import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { ThemeSelector } from '@/ui/panel';
import { Text } from '@/ui/text';
import { LanguageDropdown } from './language-dropdown';

/**
 * The shared preferences block.
 *
 * Rendered inside the Account list on every platform: a section header is
 * supplied by the screen, and the controls own their rows. Theme is the one
 * preference worth showing in full — three segments make "System" legible and
 * remove a menu from the most common setting. Language keeps its dropdown,
 * because two names in a segmented control would compete with theme for the
 * same visual weight.
 *
 * The web navbar exposes the same settings as compact menus; this is the
 * reading surface, not a second source of truth.
 */
export function PreferencesSection() {
  const { t } = useTranslation();

  return (
    <View
      testID="preferences-section"
      className={cn(
        'gap-4 border-b border-glass-edge py-4',
        Platform.OS !== 'web' && 'px-4',
      )}
    >
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Icon name="palette" size={18} tone="muted" />
          <Text variant="label">{t('theme.title')}</Text>
        </View>
        <ThemeSelector testID="theme-selector" />
      </View>

      <LanguageDropdown />
    </View>
  );
}
