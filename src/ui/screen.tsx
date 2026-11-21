import type { ReactNode } from 'react';
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';
import { cn } from './cn';
import { usePageScrollReporter } from './scroll-state';

/**
 * Screen containers.
 *
 * Two components rather than one `scroll` boolean: a non-scrolling screen must
 * not accept scroll options it silently ignores, and the two have genuinely
 * different props. Screens pick `Screen` for lists/content and `ScreenView` for
 * centring a state or a form that manages its own keyboard avoidance.
 *
 * **Top inset.** The native shell owns it through `pt-safe`, which Uniwind
 * resolves from the insets `SafeAreaListener` pushes in. `contentInsetAdjustment
 * Behavior` alone is not enough: the native tabs shell has no header, so on both
 * phones the status bar simply sat on top of the first row of every page. The
 * padding goes on the container, not the scroll content, so scrolled content
 * cannot slide back under the bar.
 *
 * On the web the bar floats over the page, so the inset that matters is the
 * chrome row — that one is applied once to the navigator's slot, not per screen,
 * because Home deliberately runs its film underneath the glass.
 *
 * The bottom is deliberately not owned here: the native tab bar already
 * reserves the home indicator, and applying it twice would leave a gap the size
 * of a second bar. Screens that need more room add their own bottom padding.
 */

export type ScreenProps = ScrollViewProps & {
  children?: ReactNode;
  /** Merged into the scroll view's `contentContainerStyle`. */
  contentContainerClassName?: string;
};

export function Screen({
  children,
  className,
  contentContainerClassName,
  contentInsetAdjustmentBehavior = 'automatic',
  keyboardShouldPersistTaps = 'handled',
  ...props
}: ScreenProps) {
  const reportPageScroll = usePageScrollReporter();

  return (
    <ScrollView
      className={cn(
        'scrollbar-stable min-h-0 flex-1 bg-background pt-safe',
        className,
      )}
      contentContainerClassName={cn(
        'grow gap-gutter p-gutter pb-section',
        contentContainerClassName,
      )}
      onScroll={reportPageScroll}
      scrollEventThrottle={16}
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      // Without this, the first tap on a button while the keyboard is open only
      // dismisses the keyboard and the user has to tap twice.
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export type ScreenViewProps = ViewProps & {
  children: ReactNode;
};

export function ScreenView({ children, className, ...props }: ScreenViewProps) {
  return (
    <View
      className={cn('scroll-balanced flex-1 bg-background pt-safe', className)}
      {...props}
    >
      {children}
    </View>
  );
}
