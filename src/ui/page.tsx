import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import { cn } from './cn';

/**
 * The measured content column.
 *
 * Every screen used to repeat `mx-auto w-full max-w-… px-…` with slightly
 * different values. `Page` owns the shared grid: a centred column with the
 * app's gutter, in two widths. Screens pass only their vertical rhythm, or
 * override the gutter when a child already owns its own padding.
 */
const WIDTHS = {
  default: 'max-w-3xl',
  wide: 'max-w-6xl',
} as const;

export type PageWidth = keyof typeof WIDTHS;

export type PageProps = ViewProps & {
  width?: PageWidth;
};

export function Page({ width = 'default', className, ...props }: PageProps) {
  return (
    <View
      className={cn('mx-auto w-full px-5', WIDTHS[width], className)}
      {...props}
    />
  );
}
