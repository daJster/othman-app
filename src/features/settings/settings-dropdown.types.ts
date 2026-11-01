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
  testID?: string;
  className?: string;
};
