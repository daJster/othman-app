import type { IconName } from '@/core/config';
import type { ThemeMode } from '@/providers/theme-provider';

/**
 * The three theme modes, in cycle order.
 *
 * `system` stays first: it is the default and the only mode that follows the
 * OS. The navbar button advances through this list; the Account control renders
 * it as a segmented choice.
 */
export type ThemeOption = {
  mode: ThemeMode;
  labelKey: 'theme.system' | 'theme.light' | 'theme.dark';
  icon: IconName;
};

export const THEME_OPTIONS = [
  { mode: 'system', labelKey: 'theme.system', icon: 'monitor' },
  { mode: 'light', labelKey: 'theme.light', icon: 'sun' },
  { mode: 'dark', labelKey: 'theme.dark', icon: 'moon' },
] as const satisfies readonly ThemeOption[];

export function themeOption(mode: ThemeMode): ThemeOption {
  return (
    THEME_OPTIONS.find((option) => option.mode === mode) ?? THEME_OPTIONS[0]
  );
}

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  const index = THEME_OPTIONS.findIndex((option) => option.mode === mode);
  return THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length].mode;
}
