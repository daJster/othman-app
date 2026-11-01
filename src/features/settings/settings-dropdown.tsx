import { MenuView } from '@expo/ui/community/menu';
import { Pressable, useColorScheme, View } from 'react-native';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import type { SettingsDropdownProps } from './settings-dropdown.types';

/**
 * Native settings dropdown.
 *
 * `MenuView` is the platform menu: SwiftUI `Menu` on iOS, Compose
 * `DropdownMenu` on Android. It is native-only (actions are inert on web,
 * which is why `settings-dropdown.web.tsx` exists), and it gives the control
 * the platform's own popup, checkmarks and dismissal behaviour.
 *
 * The trigger is the row the user sees: label on the inline start, current
 * value and chevron on the inline end. The compact form is only used if a
 * native navbar ever appears; the web navbar uses the compact variant.
 */
export function SettingsDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  variant = 'row',
  testID,
  className,
}: SettingsDropdownProps<T>) {
  const scheme = useColorScheme();
  const current =
    options.find((option) => option.value === value) ?? options[0];
  const compact = variant === 'compact';

  return (
    <MenuView
      actions={options.map((option) => ({
        id: option.value,
        title: option.label,
        state: option.value === value ? 'on' : 'off',
      }))}
      onPressAction={({ nativeEvent }) => onChange(nativeEvent.event as T)}
      colorScheme={scheme ?? 'dark'}
      testID={testID}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current.label}`}
        className={cn(
          'active:opacity-70',
          compact
            ? 'h-11 min-w-11 flex-row items-center justify-center gap-1 rounded-md px-2'
            : 'min-h-14 w-full flex-row items-center justify-between gap-3 border-b border-border px-4 py-3',
          className,
        )}
      >
        {compact ? (
          <>
            <Text variant="label" tone="muted">
              {current.shortLabel ?? current.label}
            </Text>
            <Icon name="chevron-down" size={14} tone="muted" />
          </>
        ) : (
          <>
            <Text variant="label">{label}</Text>
            <View className="flex-row items-center gap-2">
              <Text variant="label" tone="muted">
                {current.label}
              </Text>
              <Icon name="chevron-down" size={16} tone="muted" />
            </View>
          </>
        )}
      </Pressable>
    </MenuView>
  );
}
