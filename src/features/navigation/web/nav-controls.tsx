import { View } from 'react-native';
import { UserMenu } from '@/components/blocks/user-menu';
import { LanguageDropdown } from '@/features/settings/language-dropdown';
import { ThemeDropdown } from '@/features/settings/theme-dropdown';

/**
 * Trailing cluster of the web bar: theme, language and the session menu.
 *
 * Kept out of the layout file because it is the one part of the bar that is
 * *not* a navigator child. The layout must keep `TabList` and every
 * `TabTrigger` as direct children (Expo Router discovers triggers by element
 * type), so only this leaf can be extracted without changing route discovery.
 *
 * Below `sm` the avatar menu is hidden today; the redesign in this branch
 * replaces all three controls with one menu that fits every width.
 */
export function WebNavControls() {
  return (
    <View className="ms-auto flex-row items-center gap-1">
      <ThemeDropdown variant="compact" />
      <LanguageDropdown variant="compact" />
      <View className="hidden sm:flex">
        <UserMenu />
      </View>
    </View>
  );
}
