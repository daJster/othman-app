import { View } from 'react-native';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/ui/cn';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import type { SettingsDropdownProps } from './settings-dropdown.types';

/**
 * Settings dropdown, built on the react-native-reusables Select.
 *
 * One control now serves web, iOS and Android: the trigger is the row the user
 * sees, and the content is the RNR listbox with keyboard, option semantics and
 * the platform's own popover behaviour. The previous split (`MenuView` on
 * native, a raw `<select>` on web) is gone.
 *
 * The compact form is the navbar trigger; the row form is the labelled setting
 * on Account and in the reader menu.
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
  const current =
    options.find((option) => option.value === value) ?? options[0];
  const compact = variant === 'compact';
  const selected = current
    ? { value: current.value, label: current.label }
    : undefined;

  return (
    <Select
      value={selected}
      onValueChange={(next) => {
        if (next) onChange(next.value as T);
      }}
    >
      <SelectTrigger
        accessibilityLabel={`${label}: ${current.label}`}
        testID={testID}
        className={cn(
          compact
            ? 'h-11 w-auto min-w-11 justify-center gap-1 rounded-md px-2 sm:h-11'
            : 'h-auto min-h-14 w-full justify-between gap-3 rounded-none border-0 border-b border-border bg-transparent px-4 py-3',
          className,
        )}
      >
        {compact ? (
          <Text variant="label" tone="muted">
            {current.shortLabel ?? current.label}
          </Text>
        ) : (
          <>
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              {icon ? <Icon name={icon} tone="muted" /> : null}
              <Text variant="label">{label}</Text>
            </View>
            <Text variant="label" tone="muted">
              {current.label}
            </Text>
          </>
        )}
      </SelectTrigger>

      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            label={option.label}
          />
        ))}
      </SelectContent>
    </Select>
  );
}
