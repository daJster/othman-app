import { View, type ViewProps } from 'react-native';
import { cn } from './cn';

/**
 * Progress bar.
 *
 * `value` is 0–100 and is clamped here, not at the call site: a bar is a
 * visualisation of a number, so a bad number must produce an empty or full bar
 * rather than a child wider than its track. `accessibilityValue` exposes the
 * same number so the bar is not purely decorative.
 *
 * The filled part needs a percentage width, which is geometry, not a colour —
 * the one inline style this primitive uses.
 */
export type ProgressProps = Omit<ViewProps, 'children'> & {
  /** 0–100. Values outside the range (and non-finite ones) are clamped. */
  value: number;
};

export function Progress({ value, className, ...props }: ProgressProps) {
  const clamped = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    >
      <View
        testID="progress-fill"
        className="h-full rounded-full bg-primary"
        style={{ width: `${clamped}%` }}
      />
    </View>
  );
}
