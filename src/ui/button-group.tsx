import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View, type ViewProps } from 'react-native';
import { Button } from './button';
import { cn } from './cn';

/**
 * Segmented button group (the PanelUI `ButtonGroup` API, built locally).
 *
 * There is no PanelUI package in the repo or on the registry — the web app
 * carries a web-only `button-group`, and the main app has no group at all —
 * so this is the local cross-platform equivalent. It owns layout only: a row
 * of segments with a fixed gap. Selection state stays with the caller, which
 * marks the active segment (usually `secondary`) against inactive ones
 * (usually `ghost`).
 *
 * `fullWidth` stretches the group across its column and gives every segment
 * an equal share (`flex-1` merged into each child's class list). Without it
 * the group hugs its content (`w-fit` would not exist on native).
 */
export type ButtonGroupProps = ViewProps & {
  /** Stretch across the column with equal segments. */
  fullWidth?: boolean;
  children?: ReactNode;
};

export function ButtonGroup({
  fullWidth,
  className,
  children,
  ...props
}: ButtonGroupProps) {
  return (
    <View
      className={cn(
        'flex-row items-stretch gap-2',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {fullWidth
        ? Children.map(children, (child) => {
            if (!isValidElement(child)) return child;

            const segment = child as ReactElement<{ className?: string }>;

            return cloneElement(segment, {
              className: cn('flex-1', segment.props.className),
            });
          })
        : children}
    </View>
  );
}

/** Re-exported so `<ButtonGroup fullWidth><Button …>` reads from one module. */
export { Button };
