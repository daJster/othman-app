import { View } from 'react-native';
import { cn } from '@/ui/cn';
import { Text } from '@/ui/text';

/**
 * Heatmap key.
 *
 * Five swatches at the same token steps the cells use, so the legend cannot
 * drift from the grid. Earlier this component interpolated RGB values in JS;
 * the cells now read the same `primary` token through static opacity classes,
 * which means the key follows a theme change without recomputing anything.
 *
 * Hidden from assistive tech: the cells carry their own labels, and five
 * unlabelled squares read as noise.
 */
const LEVEL_CLASS = [
  'bg-muted',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/65',
  'bg-primary',
] as const;

export type ProgressLegendProps = {
  lessLabel: string;
  moreLabel: string;
  className?: string;
};

export function ProgressLegend({
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

      {LEVEL_CLASS.map((level, index) => (
        <View
          key={level}
          testID={`heatmap-legend:${index}`}
          className={cn('h-4 w-4 rounded-sm border border-glass-edge', level)}
        />
      ))}

      <Text variant="caption" tone="muted">
        {moreLabel}
      </Text>
    </View>
  );
}
