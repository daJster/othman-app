import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Badge as RNRBadge } from '@/components/ui/badge';
import { Text as RNRText } from '@/components/ui/text';
import type { StatusTone } from '@/core/config';
import { cn } from './cn';

/**
 * Colour intent for the three meeting statuses.
 *
 * Each tone is a semantic triple: a text-safe label colour, a soft surface and
 * a line. The values come from `global.css`; no raw Tailwind palette name is
 * used here. React Native has no colour inheritance: the surface and its label
 * need separate literals.
 */
const TONE_SURFACE = {
  positive: 'border-success-line bg-success-soft',
  info: 'border-info-line bg-info-soft',
  neutral: 'border-border bg-muted',
} satisfies Readonly<Record<StatusTone, string>>;

const TONE_TEXT = {
  positive: 'text-success',
  info: 'text-info',
  neutral: 'text-muted-foreground',
} satisfies Readonly<Record<StatusTone, string>>;

/**
 * Badge primitive, backed by react-native-reusables.
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

const RNR_VARIANT = {
  default: 'default',
  secondary: 'secondary',
  outline: 'outline',
  destructive: 'destructive',
  positive: 'outline',
  info: 'outline',
  neutral: 'outline',
} as const;

export function Badge({
  variant,
  label,
  children,
  className,
  ...props
}: BadgeProps) {
  const slots = badge({ variant });

  return (
    <RNRBadge
      variant={RNR_VARIANT[variant ?? 'default']}
      className={cn(slots.root(), className)}
      {...props}
    >
      {label ? (
        <RNRText className={slots.label()}>{label}</RNRText>
      ) : typeof children === 'string' ? (
        <RNRText className={slots.label()}>{children}</RNRText>
      ) : (
        children
      )}
    </RNRBadge>
  );
}
