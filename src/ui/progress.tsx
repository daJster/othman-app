import type { ViewProps } from 'react-native';
import { Progress as RNRProgress } from '@/components/ui/progress';
import { cn } from './cn';

/**
 * Progress bar, backed by react-native-reusables.
 *
 * `value` is 0–100 and is clamped here, not at the call site: a bar is a
 * visualisation of a number, so a bad number must produce an empty or full bar
 * rather than a child wider than its track. `accessibilityValue` exposes the
 * same number so the bar is not purely decorative.
 */
export type ProgressProps = Omit<ViewProps, 'children'> & {
  /** 0–100. Values outside the range (and non-finite ones) are clamped. */
  value: number;
};

export function Progress({ value, className, ...props }: ProgressProps) {
  const clamped = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0;
  const rounded = Math.round(clamped);

  return (
    <RNRProgress
      value={rounded}
      max={100}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: rounded }}
      indicatorClassName="bg-primary"
      className={cn('h-2 w-full rounded-full bg-muted', className)}
      {...props}
    />
  );
}
