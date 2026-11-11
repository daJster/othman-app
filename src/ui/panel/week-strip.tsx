import { View, type ViewProps } from 'react-native';
import { cn } from '../cn';
import { Text } from '../text';

/**
 * Seven day cells for one week of activity.
 *
 * The strip is a glance, not a chart: the weekday sits above a filled cell and
 * the number of items sits inside it. A day with nothing recorded keeps an
 * empty muted cell so the week's shape stays readable — a missing cell would
 * silently shorten the week.
 *
 * The fill uses five token steps shared with the heatmap. Because the number is
 * printed inside the cell, the meaning never depends on the fill alone.
 */
export type WeekStripDay = {
  /** Stable key, usually a `YYYY-MM-DD` day key. */
  key: string;
  /** Short weekday label. */
  label: string;
  count: number;
  /** 0–4. Out-of-range values are clamped. */
  level: number;
  /** Spoken description for the cell. */
  accessibilityLabel: string;
};

export type WeekStripProps = Omit<ViewProps, 'children'> & {
  days: readonly WeekStripDay[];
  testID?: string;
};

const LEVEL_CLASS = [
  'bg-muted',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/65',
  'bg-primary',
] as const;

export function WeekStrip({
  days,
  className,
  testID,
  ...props
}: WeekStripProps) {
  return (
    <View
      testID={testID}
      className={cn('w-full flex-row gap-1.5', className)}
      {...props}
    >
      {days.map((day) => {
        const level = Math.min(4, Math.max(0, Math.round(day.level)));
        const filled = level >= 4;

        return (
          <View key={day.key} className="flex-1 items-center gap-1.5">
            <Text variant="caption" tone="muted" align="center">
              {day.label}
            </Text>

            <View
              className={cn(
                'h-12 w-full items-center justify-center rounded-chip border border-glass-edge',
                LEVEL_CLASS[level],
              )}
              accessible
              accessibilityLabel={day.accessibilityLabel}
            >
              {day.count > 0 ? (
                <Text
                  variant="label"
                  className={cn(
                    'font-semibold',
                    filled ? 'text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {day.count}
                </Text>
              ) : (
                <View className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
