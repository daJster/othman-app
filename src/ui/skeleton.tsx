import type { ViewProps } from 'react-native';
import { Skeleton as RNRSkeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder, backed by react-native-reusables.
 *
 * It stays out of the accessibility tree: a shimmer has no information, and
 * the surrounding `Loading` state owns the announcement.
 */
export function Skeleton(props: ViewProps) {
  return (
    <RNRSkeleton
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...props}
    />
  );
}
