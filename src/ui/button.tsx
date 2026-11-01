import type { ReactNode } from 'react';
import { type TextProps as RNTextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import {
  Button as RNRButton,
  type ButtonProps as RNRButtonProps,
} from '@/components/ui/button';
import { Text as RNRText } from '@/components/ui/text';
import { cn } from './cn';

/**
 * Button primitive, backed by react-native-reusables.
 *
 * The RNR button owns the variants, pressed states and web focus ring. This
 * wrapper keeps the app's `label` convenience and its 44pt floor:
 *
 *  - `sm`/`md` are 44px, `lg` is 48px, `icon` is 44×44. RNR's native defaults
 *    (40/36) would regress the platform tap-target rule.
 *  - `ButtonText` keeps the app's token-based label colours. RNR's
 *    `TextClassContext` is still active, so a raw RNR `Text` inside a RNR
 *    button inherits the correct colour too.
 *
 * Two ways to put content in: `label` for the common text button, or `children`
 * for composed content (icon + text). When composing, use `ButtonText`.
 */
const button = tv({
  base: '',
  variants: {
    variant: {
      default: '',
      secondary: '',
      outline: '',
      ghost: '',
      destructive: '',
      link: '',
    },
    size: {
      sm: 'h-11 gap-1.5 px-3 sm:h-11',
      md: 'h-11 gap-2 px-4 sm:h-11',
      lg: 'h-12 gap-2 px-6 sm:h-12',
      icon: 'h-11 w-11 sm:h-11 sm:w-11',
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

const RNR_SIZE = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
  icon: 'icon',
} as const;

export type ButtonVariant = NonNullable<VariantProps<typeof button>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof button>['size']>;

export type ButtonProps = Omit<
  RNRButtonProps,
  'children' | 'variant' | 'size'
> &
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
    <RNRButton
      variant={variant}
      size={RNR_SIZE[size ?? 'md']}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      className={cn(button({ variant, size, className }))}
      {...props}
    >
      {label ? (
        <RNRText className={buttonLabel({ variant, size })}>{label}</RNRText>
      ) : (
        children
      )}
    </RNRButton>
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
    <RNRText className={buttonLabel({ variant, size, className })} {...props} />
  );
}
