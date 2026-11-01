import type { ThemeMode } from '@/providers/theme-provider';

/**
 * The three theme modes.
 *
 * `system` stays first: it is the default and the only mode that follows the
 * OS. `shortKey` is the compact navbar label; the full label is used in the
 * dropdown menu and the Account/reader rows.
 */
export type ThemeOption = {
  mode: ThemeMode;
  labelKey: 'theme.system' | 'theme.light' | 'theme.dark';
  shortKey: 'theme.autoShort' | 'theme.lightShort' | 'theme.darkShort';
};

export const THEME_OPTIONS = [
  {
    mode: 'system',
    labelKey: 'theme.system',
    shortKey: 'theme.autoShort',
  },
  {
    mode: 'light',
    labelKey: 'theme.light',
    shortKey: 'theme.lightShort',
  },
  {
    mode: 'dark',
    labelKey: 'theme.dark',
    shortKey: 'theme.darkShort',
  },
] as const satisfies readonly ThemeOption[];
