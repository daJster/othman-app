import { View, type ViewProps } from 'react-native';
import { cn } from './cn';

/**
 * Skeleton placeholder.
 *
 * Deliberately static. A pulse loop is motion, and motion in this app belongs
 * to Reanimated (one animation driver, one reduced-motion switch, P4.4) — a
 * primitive that starts an animation on mount would also need to be torn down
 * in every test that renders it.
 *
 * Always give it the size of the thing it replaces (`h-4 w-3/4`), otherwise the
 * layout jumps when the real content arrives — which is worse than a blank
 * screen.
 */
export function Skeleton({ className, ...props }: ViewProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('rounded-md bg-muted', className)}
      {...props}
    />
  );
}
