import { useColorScheme, View } from 'react-native';
import { useUiFontClass } from '@/ui/font';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import type { SettingsDropdownProps } from './settings-dropdown.types';

/**
 * Web settings dropdown.
 *
 * A real `<select>`: keyboard, type-ahead, screen-reader option semantics and
 * the browser's popup come for free. The visual chrome is the app's, and the
 * chevron is an overlay because the native arrow is suppressed with
 * `appearance-none`.
 *
 * The compact form shows short labels so the navbar still fits at 390; the
 * row form shows full labels on Account and in the reader menu.
 */
export function SettingsDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  variant = 'row',
  icon,
  testID,
  className,
}: SettingsDropdownProps<T>) {
  const scheme = useColorScheme();
  const fontClass = useUiFontClass();
  const current =
    options.find((option) => option.value === value) ?? options[0];
  const compact = variant === 'compact';

  const select = (
    <select
      aria-label={`${label}: ${current.label}`}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      data-testid={testID}
      className={cn(
        'h-11 appearance-none rounded-md border border-border bg-background text-sm text-foreground',
        FOCUS_RING,
        fontClass,
        compact ? 'w-[4.5rem] ps-1 pe-6 text-xs' : 'w-40 ps-2 pe-7',
        className,
      )}
      style={{ colorScheme: scheme === 'dark' ? 'dark' : 'light' }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {compact ? (option.shortLabel ?? option.label) : option.label}
        </option>
      ))}
    </select>
  );

  if (compact) {
    return (
      <View className="relative">
        {select}
        <View
          pointerEvents="none"
          className="absolute end-1.5 top-1/2 -translate-y-1/2"
        >
          <Icon name="chevron-down" size={12} tone="muted" />
        </View>
      </View>
    );
  }

  return (
    <View
      className={cn(
        'min-h-14 flex-row items-center justify-between gap-3 border-b border-border px-4 py-2',
        className,
      )}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        {icon ? <Icon name={icon} tone="muted" /> : null}
        <Text variant="label">{label}</Text>
      </View>
      <View className="relative">
        {select}
        <View
          pointerEvents="none"
          className="absolute end-1.5 top-1/2 -translate-y-1/2"
        >
          <Icon name="chevron-down" size={14} tone="muted" />
        </View>
      </View>
    </View>
  );
}
