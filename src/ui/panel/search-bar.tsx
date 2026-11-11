import { useTranslation } from 'react-i18next';
import { View, type ViewProps } from 'react-native';
import { cn } from '../cn';
import { FOCUS_RING } from '../focus';
import { Icon } from '../icon';
import { Input } from '../input';
import { Pressable } from '../pressable';

/**
 * In-page search field.
 *
 * The field is a single hairline container with a leading glyph and a clear
 * control at the inline end — no floating label, no submit button. Filtering is
 * incremental, so the result is visible while the reader types.
 *
 * The clear control only appears when there is something to clear, and it is a
 * real 44 pt target rather than a decorative glyph.
 */
export type SearchBarProps = Omit<ViewProps, 'children'> & {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /** Spoken name; defaults to the placeholder. */
  accessibilityLabel?: string;
  clearAccessibilityLabel?: string;
  testID?: string;
  inputTestID?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  clearAccessibilityLabel,
  testID,
  inputTestID,
  className,
  ...props
}: SearchBarProps) {
  const { t } = useTranslation();
  const hasValue = value.length > 0;

  return (
    <View
      testID={testID}
      className={cn(
        'min-h-control w-full flex-row items-center gap-2 rounded-panel border border-glass-edge bg-glass pr-1 pl-3',
        FOCUS_RING,
        className,
      )}
      {...props}
    >
      <Icon name="search" size={18} tone="muted" />

      <Input
        testID={inputTestID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none"
      />

      {hasValue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel ?? t('action.clear')}
          onPress={() => onChangeText('')}
          className={cn(
            'h-control w-control items-center justify-center rounded-chip active:opacity-70',
            FOCUS_RING,
          )}
        >
          <Icon name="close" size={16} tone="muted" />
        </Pressable>
      ) : null}
    </View>
  );
}
