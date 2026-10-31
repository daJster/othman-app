import type { ReactNode } from 'react';
import {
  Pressable,
  Text as RNText,
  type PressableProps,
  type TextProps as RNTextProps,
} from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

/**
 * Button primitive — the CVA button from the web app, ported to `tv()`.
 *
 * Differences from the web version, all deliberate:
 *  - `hover:`/`focus-visible:` are dropped; touch has neither.
 *  - `active:opacity-80` replaces the 1px translate, which reads as jitter on a
 *    touch screen.
 *  - Sizes start at 36px (`sm`) instead of 28px: the 44pt tap target rule is a
 *    platform guideline, not a browser suggestion.
 *  - `link` has no `underline-offset`; RN's `underline` is all-or-nothing.
 *
 * Two ways to put content in: `label` for the common text button, or `children`
 * for composed content (icon + text). When composing, use `ButtonText` so the
 * label colour matches the variant — RN does not inherit text colour from a
 * parent view.
 */
const button = tv({
  base: 'flex-row items-center justify-center rounded-lg border border-transparent active:opacity-80 disabled:opacity-50',
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      outline: 'border-border bg-background',
      ghost: 'bg-transparent',
      destructive: 'bg-destructive',
      link: 'bg-transparent',
    },
    size: {
      sm: 'h-9 gap-1.5 px-3',
      md: 'h-11 gap-2 px-4',
      lg: 'h-12 gap-2 px-6',
      icon: 'h-11 w-11',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

const buttonLabel = tv({
  base: 'font-semibold',
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
      destructive: 'text-destructive-foreground',
      link: 'text-primary underline',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-base',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export type ButtonVariant = NonNullable<VariantProps<typeof button>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof button>['size']>;

export type ButtonProps = Omit<PressableProps, 'children'> &
  VariantProps<typeof button> & {
    label?: string;
    children?: ReactNode;
  };

export function Button({
  variant,
  size,
  label,
  children,
  className,
  disabled,
  accessibilityRole = 'button',
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      className={button({ variant, size, className })}
      {...props}
    >
      {label ? (
        <RNText className={buttonLabel({ variant, size })}>{label}</RNText>
      ) : (
        children
      )}
    </Pressable>
  );
}

export type ButtonTextProps = RNTextProps & VariantProps<typeof buttonLabel>;

/** Label for a composed button (`<Button><Icon /><ButtonText>…`). */
export function ButtonText({
  variant,
  size,
  className,
  ...props
}: ButtonTextProps) {
  return (
    <RNText className={buttonLabel({ variant, size, className })} {...props} />
  );
}
