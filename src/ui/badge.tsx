import type { ReactNode } from 'react';
import { Text, View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import type { StatusTone } from '@/core/config';

/**
 * Colour intent for the three meeting statuses.
 *
 * Badge was the only consumer of the shared tone file, so the tables live here.
 * React Native has no colour inheritance: the surface and its label need
 * separate literals.
 */
const TONE_SURFACE = {
  positive:
    'border-emerald-200 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950',
  info: 'border-sky-200 bg-sky-100 dark:border-sky-800 dark:bg-sky-950',
  neutral: 'border-border bg-muted',
} satisfies Readonly<Record<StatusTone, string>>;

const TONE_TEXT = {
  positive: 'text-emerald-700 dark:text-emerald-400',
  info: 'text-sky-700 dark:text-sky-400',
  neutral: 'text-muted-foreground',
} satisfies Readonly<Record<StatusTone, string>>;

/**
 * Badge primitive.
 *
 * The `positive | info | neutral` variants are the meeting-status tones; the
 * remaining four are the shadcn set. Both live in one `variant` prop so a
 * caller never has to combine "variant" with "tone" and wonder which wins.
 *
 * Slots (`root`/`label`) exist because RN cannot inherit text colour: the
 * surface and the label each need their own class string.
 */
const badge = tv({
  slots: {
    root: 'flex-row items-center gap-1 self-start rounded-md border px-2 py-0.5',
    label: 'text-2xs font-semibold',
  },
  variants: {
    variant: {
      default: {
        root: 'border-transparent bg-primary',
        label: 'text-primary-foreground',
      },
      secondary: {
        root: 'border-transparent bg-secondary',
        label: 'text-secondary-foreground',
      },
      outline: {
        root: 'border-border bg-transparent',
        label: 'text-foreground',
      },
      destructive: {
        root: 'border-transparent bg-destructive',
        label: 'text-destructive-foreground',
      },
      positive: {
        root: TONE_SURFACE.positive,
        label: TONE_TEXT.positive,
      },
      info: {
        root: TONE_SURFACE.info,
        label: TONE_TEXT.info,
      },
      neutral: {
        root: TONE_SURFACE.neutral,
        label: TONE_TEXT.neutral,
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type BadgeVariant = NonNullable<VariantProps<typeof badge>['variant']>;

export type BadgeProps = Omit<ViewProps, 'children'> &
  VariantProps<typeof badge> & {
    /** Shorthand for a text-only badge. Use `children` for icon + text. */
    label?: string;
    children?: ReactNode;
  };

export function Badge({
  variant,
  label,
  children,
  className,
  ...props
}: BadgeProps) {
  const slots = badge({ variant });

  return (
    <View className={slots.root({ className })} {...props}>
      {label ? (
        <Text className={slots.label()}>{label}</Text>
      ) : typeof children === 'string' ? (
        <Text className={slots.label()}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}
