import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import { cn } from './cn';

/**
 * The card surface.
 *
 * Subcomponents were removed when the app stopped using them: a card is a
 * content block, and its sections are ordinary views. The surface is still the
 * grouped container for the meetings and progress summaries.
 */
export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'gap-3 rounded-xl border border-border bg-card p-4',
        className,
      )}
      {...props}
    />
  );
}
