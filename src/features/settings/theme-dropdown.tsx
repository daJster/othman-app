import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/providers/theme-provider';
import { SettingsDropdown } from './settings-dropdown';
import type { SettingsDropdownVariant } from './settings-dropdown.types';
import { THEME_OPTIONS } from './theme-options';

/**
 * Theme choice, shared by the navbar, Account and the reader menu.
 *
 * `variant="compact"` is the navbar's short trigger; the default row is the
 * labelled form for settings surfaces.
 */
export type ThemeDropdownProps = {
  variant?: SettingsDropdownVariant;
  className?: string;
  testID?: string;
};

export function ThemeDropdown({
  variant = 'row',
  className,
  testID = 'theme-dropdown',
}: ThemeDropdownProps) {
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();

  return (
    <SettingsDropdown
      label={t('theme.title')}
      value={mode}
      options={THEME_OPTIONS.map((option) => ({
        value: option.mode,
        label: t(option.labelKey),
        shortLabel: t(option.shortKey),
      }))}
      onChange={setMode}
      variant={variant}
      icon="palette"
      className={className}
      testID={testID}
    />
  );
}
