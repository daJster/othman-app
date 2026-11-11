import { Platform } from 'react-native';
import type { ViewProps } from 'react-native';
import { Skeleton as RNRSkeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder, backed by react-native-reusables.
 *
 * It stays out of the accessibility tree: a shimmer has no information, and
 * the surrounding `Loading` state owns the announcement.
 *
 * `aria-hidden` is the cross-platform answer, but React Native's own props stay
 * on native only: passing `importantForAccessibility` to a DOM element is an
 * unknown-prop warning, and neither platform needs both spellings.
 */
const NATIVE_HIDDEN =
  Platform.OS === 'web'
    ? {}
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
      };

export function Skeleton(props: ViewProps) {
  return <RNRSkeleton aria-hidden {...NATIVE_HIDDEN} {...props} />;
}
