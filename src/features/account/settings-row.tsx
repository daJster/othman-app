import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/config';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * One account row, from the app's own primitives.
 *
 * `@expo/ui`'s `List` is the right choice on iOS/Android: it is a real SwiftUI
 * List / Compose LazyColumn with the platform's separators and pressed states.
 * Its web fallback paints row labels with a hard-coded dark colour, which on a
 * dark background measured 1.23:1. The web path therefore renders the same rows
 * from tokens, and this is the row both the settings and the preference groups
 * share so the two cannot drift.
 *
 * Grammar follows the rest of the app: hairlines, not boxes; a leading glyph, a
 * label with one quiet supporting line, and a directional chevron. Rows are
 * 56 px tall, which also clears the 44 px tap target. The row uses `flex-row`:
 * under `dir="rtl"` CSS already reverses the inline axis, so an additional
 * `flex-row-reverse` would put the leading glyph on the wrong side.
 *
 * It is safe to import on native — it is ordinary RN — but only the web branch
 * renders it; native keeps the platform list.
 */
export type SettingsRowProps = {
  testID: string;
  icon: IconName;
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  /** The row closes a grouped surface: no trailing hairline. */
  last?: boolean;
};

export function SettingsRow({
  testID,
  icon,
  label,
  description,
  onPress,
  destructive = false,
  showChevron = true,
  last = false,
}: SettingsRowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'min-h-14 w-full flex-row items-center gap-3 py-3 active:opacity-70',
        !last && 'border-b border-glass-edge',
        FOCUS_RING,
      )}
    >
      <Icon name={icon} tone={destructive ? 'destructive' : 'muted'} />

      <View className="min-w-0 flex-1 items-start gap-0.5">
        <Text variant="label" tone={destructive ? 'destructive' : 'default'}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>

      {showChevron ? (
        <Icon name="chevron-right" size={18} tone="muted" />
      ) : null}
    </Pressable>
  );
}
