/**
 * What a spinner has to answer, on either platform.
 *
 * Both implementations agree on this shape so a caller never branches:
 * `import { Spinner } from '@/ui/spinner'` resolves to the Reanimated ring on a
 * phone and to the SVG spoke spinner on the web (Metro picks `.web.tsx`).
 *
 * There is one look and no variants: the two platforms draw the same idea with
 * their own tools, and a caller only chooses a size.
 */
export type SpinnerSize = 'sm' | 'md' | 'lg';

export type SpinnerProps = {
  size?: SpinnerSize;
  /** What a screen reader announces. Unset keeps it out of the tree. */
  label?: string;
  /** The turning arc. Defaults to the theme's primary. */
  color?: string;
  /** The ring the arc turns around. Native only. */
  trackColor?: string;
  className?: string;
  testID?: string;
};
