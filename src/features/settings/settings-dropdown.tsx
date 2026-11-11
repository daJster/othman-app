import { useRef, useState, type ComponentRef } from 'react';
import { Dimensions, Platform, View } from 'react-native';
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
 * The height the options list needs before it is worth opening upwards. Three
 * options and the panel's padding: the primitive measures the real content
 * height, this is only the decision threshold, so a rough constant is enough.
 */
const MENU_ITEM_HEIGHT = 44;
const MENU_PADDING = 16;

/**
 * Settings dropdown, built on the react-native-reusables Select.
 *
 * One control now serves web, iOS and Android: the trigger is the row the user
 * sees, and the content is the RNR listbox with keyboard, option semantics and
 * the platform's own popover behaviour.
 *
 * **Anchoring.** On the web Radix does the work: the panel is placed relative to
 * the trigger, offset by 4 px and flipped by the collision detection. On native
 * `@rn-primitives` only knows the trigger's rectangle and clamps — it never
 * flips — so this component measures its own row on open and picks the side
 * itself, then gives the panel the row's width so it opens flush under it
 * instead of as a narrow floating card at one corner. Both branches are
 * exposed through the same props: `side` and a `minWidth` style.
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

  const anchor = useRef<ComponentRef<typeof View>>(null);
  const [placement, setPlacement] = useState<{
    side: 'top' | 'bottom';
    width: number | null;
  }>({ side: 'bottom', width: null });

  /**
   * Native only: pick the side and the width from the row's own rectangle.
   * Measuring on open (rather than on layout) keeps it correct after the list
   * has scrolled or a row has been recycled.
   */
  const place = () => {
    if (Platform.OS === 'web') {
      return;
    }

    anchor.current?.measureInWindow((_x, y, width, height) => {
      const { height: screenHeight } = Dimensions.get('window');
      const below = screenHeight - (y + height);
      const needed = options.length * MENU_ITEM_HEIGHT + MENU_PADDING;

      setPlacement({
        // Flip only when opening downwards would not fit *and* there is more
        // room above; otherwise stay below and let the list scroll.
        side: below < needed && y > below ? 'top' : 'bottom',
        width,
      });
    });
  };

  return (
    <View ref={anchor} collapsable={false}>
      <Select
        value={selected}
        onOpenChange={(open) => {
          if (open) {
            place();
          }
        }}
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
              : 'h-auto min-h-14 w-full justify-between gap-3 rounded-none border-0 border-b border-glass-edge bg-transparent px-4 py-3',
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

        <SelectContent
          side={placement.side}
          style={
            Platform.OS !== 'web' && placement.width
              ? { minWidth: placement.width }
              : undefined
          }
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              label={option.label}
            />
          ))}
        </SelectContent>
      </Select>
    </View>
  );
}
