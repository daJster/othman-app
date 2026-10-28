import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Separator primitive.
 *
 * A hairline, not a 1px border: on a 3x screen `h-px` is a visible line while
 * `border-hairline` (Uniwind maps it to `hairlineWidth()`) is the thinnest line
 * the display can draw. Vertical separators stretch with their row, so they use
 * `self-stretch` instead of a height.
 */
const separator = tv({
  base: 'bg-border',
  variants: {
    orientation: {
      horizontal: 'h-px w-full',
      vertical: 'w-px self-stretch',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

export type SeparatorProps = ViewProps &
  VariantProps<typeof separator> & {
    /** Purely decorative by default; set to `separator` for a real divider. */
    decorative?: boolean;
  };

export function Separator({
  orientation,
  decorative = true,
  className,
  ...props
}: SeparatorProps) {
  return (
    <View
      // RN's `accessibilityRole` has no `separator`; the ARIA-style `role`
      // prop does, so it is the one that can express a semantic divider.
      role={decorative ? 'none' : 'separator'}
      className={separator({ orientation, className })}
      {...props}
    />
  );
}
