import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/providers/theme-provider';
import { Icon } from '@/ui/icon';
import { SettingsButton } from './settings-button';
import { nextThemeMode, themeOption } from './theme-options';

/**
 * Navbar theme control.
 *
 * Shows the mode currently in effect and advances on tap. The icon is the
 * state, not the action: a moon means dark mode is on, not "tap for dark".
 */
export function ThemeButton() {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();
  const current = themeOption(mode);

  return (
    <SettingsButton
      testID="nav-theme-toggle"
      label={`${t('nav.toggleTheme')}: ${t(current.labelKey)}`}
      onPress={() => setMode(nextThemeMode(mode))}
    >
      <Icon name={current.icon} size={20} tone="muted" />
    </SettingsButton>
  );
}
