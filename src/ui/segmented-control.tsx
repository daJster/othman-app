import { Pressable, View, type ViewProps } from 'react-native';
import { cn } from './cn';
import { Text } from './text';

/**
 * Segmented control.
 *
 * A row of mutually exclusive options, exposed to assistive technology as a
 * radio group: a segmented control is a set of radios, not a row of buttons, and
 * a plain button would lose which option is active.
 *
 * Deliberately generic over the value type and label-free of any domain: theme
 * and language both use it, and both supply already-translated labels. Native
 * segmented controls (`@expo/ui`) are the better choice for a long list; this is
 * for the two- and three-option case where styling must match the app's own
 * surfaces on all three targets.
 */
export type SegmentedOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
};

export type SegmentedControlProps<Value extends string> = Omit<
  ViewProps,
  'children'
> & {
  /** Accessible name for the group, e.g. "Theme". */
  label: string;
  value: Value;
  options: readonly SegmentedOption<Value>[];
  onChange: (value: Value) => void;
};

export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChange,
  className,
  ...props
}: SegmentedControlProps<Value>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className={cn(
        'flex-row gap-1 self-start rounded-lg border border-border bg-muted p-1',
        className,
      )}
      {...props}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              // 36 pt segments inside 4 pt of padding clear the app's 44 pt
              // control height without making the two-option case look like a
              // toolbar.
              'h-9 items-center justify-center rounded-md px-3 active:opacity-80',
              selected ? 'bg-background' : 'bg-transparent',
            )}
          >
            <Text
              variant="label"
              tone={selected ? 'default' : 'muted'}
              className="text-xs"
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
