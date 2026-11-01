import { View } from 'react-native';
import { LanguageDropdown } from './language-dropdown';
import { ThemeDropdown } from './theme-dropdown';

/**
 * The shared preferences block.
 *
 * Rendered inside the Account list on every platform: a section header is
 * supplied by the screen, and the two dropdown rows own the controls. The web
 * navbar exposes the same settings as compact dropdowns.
 */
export function PreferencesSection() {
  return (
    <View testID="preferences-section">
      <ThemeDropdown />
      <LanguageDropdown />
    </View>
  );
}
