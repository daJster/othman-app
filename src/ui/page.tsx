import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import { cn } from './cn';

/**
 * The measured content column.
 *
 * Every screen used to repeat `mx-auto w-full max-w-… px-…` with slightly
 * different values. `Page` owns the shared grid: a centred column, one gutter
 * and two widths. Screens pass only their vertical rhythm; a screen must not
 * override `px-*`. If a child list owns full-bleed rows, the child imports
 * `PAGE_GUTTER` instead of repeating a pixel value.
 *
 * The gutter is 16px on a phone and 20px from `sm` up; the web navbar's inline
 * padding uses the same scale.
 */
export const PAGE_GUTTER = 'px-4 sm:px-5';

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
      className={cn('mx-auto w-full', PAGE_GUTTER, WIDTHS[width], className)}
      {...props}
    />
  );
}
