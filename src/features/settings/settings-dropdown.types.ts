import type { IconName } from '@/core/config';

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
  shortLabel?: string;
};

export type SettingsDropdownVariant = 'compact' | 'row';

export type SettingsDropdownProps<T extends string> = {
  label: string;
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  variant?: SettingsDropdownVariant;
  /** Leading glyph for the row form; the compact navbar has no room. */
  icon?: IconName;
  testID?: string;
  className?: string;
};
