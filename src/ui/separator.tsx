import type { ViewProps } from 'react-native';
import { Separator as RNRSeparator } from '@/components/ui/separator';
import { cn } from './cn';

/**
 * Separator primitive, backed by react-native-reusables.
 *
 * The RNR primitive owns the semantic role. This wrapper keeps the app's
 * hairline geometry and its vertical `self-stretch`, because a vertical
 * separator has to follow the height of its row rather than its own content.
 */
export type SeparatorProps = ViewProps & {
  orientation?: 'horizontal' | 'vertical';
  /** Purely decorative by default; set to `false` for a real divider. */
  decorative?: boolean;
};

export function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
  ...props
}: SeparatorProps) {
  return (
    <RNRSeparator
      orientation={orientation}
      decorative={decorative}
      role={decorative ? 'none' : 'separator'}
      className={cn(
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className,
      )}
      {...props}
    />
  );
}
