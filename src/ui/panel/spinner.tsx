import { ActivityIndicator, View, type ViewProps } from 'react-native';
import { cn } from '../cn';
import { Text } from '../text';

/**
 * A themed activity indicator with an optional spoken label.
 *
 * The app already has `Loading` (a full centred state). `Spinner` is the inline
 * form used inside buttons, cards and form submissions, where a full state
 * would be too loud. Sizes are mapped to the platform's own indicator rather
 * than fixed pixels so Android and iOS keep their native animation.
 */
export type SpinnerSize = 'sm' | 'md' | 'lg';

const NATIVE_SIZE: Record<SpinnerSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
};

export type SpinnerProps = Omit<ViewProps, 'children'> & {
  size?: SpinnerSize;
  /** Visible caption; also announced as the progress label. */
  label?: string;
  /** Visually hide the caption but keep it for assistive tech. */
  labelHidden?: boolean;
};

export function Spinner({
  size = 'md',
  label,
  labelHidden = false,
  className,
  ...props
}: SpinnerProps) {
  return (
    <View
      className={cn('flex-row items-center gap-2', className)}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      {...props}
    >
      <ActivityIndicator
        size={NATIVE_SIZE[size]}
        colorClassName="accent-primary"
      />
      {label ? (
        <Text
          variant="caption"
          tone="muted"
          className={labelHidden ? 'sr-only' : undefined}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
