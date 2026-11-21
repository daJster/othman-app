import type { IconName } from '@/core/config';
import type { ThemeMode } from '@/providers/theme-provider';

/**
 * The three theme modes.
 *
 * `system` stays first: it is the default and the only mode that follows the
 * OS. `shortKey` is the compact navbar label; the full label is used in the
 * dropdown menu and the Account/reader rows. `icon` is the Lucide name the bar
 * and the menu draw, so the trigger can show the mode it is actually in
 * instead of one neutral glyph.
 */
export type ThemeOption = {
  mode: ThemeMode;
  labelKey: 'theme.system' | 'theme.light' | 'theme.dark';
  shortKey: 'theme.autoShort' | 'theme.lightShort' | 'theme.darkShort';
  icon: IconName;
};

export const THEME_OPTIONS = [
  {
    mode: 'system',
    labelKey: 'theme.system',
    shortKey: 'theme.autoShort',
    icon: 'monitor',
  },
  {
    mode: 'light',
    labelKey: 'theme.light',
    shortKey: 'theme.lightShort',
    icon: 'sun',
  },
  {
    mode: 'dark',
    labelKey: 'theme.dark',
    shortKey: 'theme.darkShort',
    icon: 'moon',
  },
] as const satisfies readonly ThemeOption[];
