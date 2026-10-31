import type { ReactNode } from 'react';
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';
import { cn } from './cn';

/**
 * Screen containers.
 *
 * Two components rather than one `scroll` boolean: a non-scrolling screen must
 * not accept scroll options it silently ignores, and the two have genuinely
 * different props. Screens pick `Screen` for lists/content and `ScreenView` for
 * centring a state or a form that manages its own keyboard avoidance.
 *
 * Neither applies safe-area insets. Insets are a layout concern owned by the
 * shell (native tabs / stack header, P3.2), and applying them here too would
 * double the gap under a tab bar.
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
  return (
    <ScrollView
      className={cn('flex-1 bg-background', className)}
      contentContainerClassName={cn(
        'grow gap-4 p-4 pb-8',
        contentContainerClassName,
      )}
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
    <View className={cn('flex-1 bg-background', className)} {...props}>
      {children}
    </View>
  );
}
