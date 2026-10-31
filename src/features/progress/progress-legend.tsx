import { View } from 'react-native';
import { getHeatmapColor } from '@/core/utils/heatmap';
import { cn } from '@/ui/cn';
import { Text } from '@/ui/text';

/**
 * Heatmap key.
 *
 * Five swatches at the same stops the cells are coloured from, so the legend
 * cannot drift from the ramp. `backgroundColor` is computed by
 * `core/utils/heatmap.ts` — the one module allowed to produce colours outside
 * the token block — which is why the swatch uses `style`: the value is a
 * gradient position, not a theme token.
 *
 * Hidden from assistive tech: the cells carry their own labels, and five
 * unlabelled squares read as noise.
 */
const STOPS = [0, 25, 50, 75, 100] as const;

export type ProgressLegendProps = {
  isDark: boolean;
  lessLabel: string;
  moreLabel: string;
  className?: string;
};

export function ProgressLegend({
  isDark,
  lessLabel,
  moreLabel,
  className,
}: ProgressLegendProps) {
  return (
    <View
      className={cn('flex-row items-center justify-center gap-2', className)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant="caption" tone="muted">
        {lessLabel}
      </Text>

      {STOPS.map((stop) => (
        <View
          key={stop}
          testID={`heatmap-legend:${stop}`}
          className="h-4 w-4 rounded-sm border border-border"
          style={{ backgroundColor: getHeatmapColor(stop, isDark) }}
        />
      ))}

      <Text variant="caption" tone="muted">
        {moreLabel}
      </Text>
    </View>
  );
}
