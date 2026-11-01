import type { ComponentRef, Ref } from 'react';
import type { TextInput } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Input as RNRInput } from '@/components/ui/input';
import { cn } from './cn';
import { useUiFontClass } from './font';

/**
 * Text input, backed by react-native-reusables.
 *
 * Colour props (`placeholderTextColor`, `selectionColor`, `cursorColor`) are
 * not style objects, so Uniwind reaches them through the `*ClassName` props
 * with an `accent-` prefix. Heights are 44/48px, not RNR's 40/36, so the field
 * keeps the app's tap-target floor at every breakpoint.
 *
 * `invalid` is both a visual state and a web semantics contract: it paints the
 * destructive border and emits `aria-invalid`, so a screen reader can tie the
 * error text to the field instead of announcing two unrelated nodes.
 */
const input = tv({
  base: 'w-full rounded-lg bg-transparent',
  variants: {
    size: {
      md: 'h-11 sm:h-11',
      lg: 'h-12 sm:h-12',
    },
    invalid: {
      true: 'border-destructive',
      false: 'border-input',
    },
  },
  defaultVariants: {
    size: 'md',
    invalid: false,
  },
});

export type InputProps = React.ComponentProps<typeof RNRInput> &
  VariantProps<typeof input> & {
    /** Red border + `aria-invalid` semantics (validation failed). */
    invalid?: boolean;
    ref?: Ref<ComponentRef<typeof TextInput>>;
  };

/** The one ARIA state React Native's own props do not declare. */
type InputAriaProps = { 'aria-invalid'?: boolean };

export function Input({
  size,
  invalid,
  className,
  ref,
  placeholderTextColorClassName = 'accent-muted-foreground',
  selectionColorClassName = 'accent-primary',
  cursorColorClassName = 'accent-primary',
  ...props
}: InputProps) {
  // TextEntry does not inherit the Text default, so the family is explicit.
  const fontClass = useUiFontClass();
  const ariaProps: InputAriaProps = invalid ? { 'aria-invalid': true } : {};

  return (
    <RNRInput
      ref={ref}
      className={cn(input({ size, invalid }), fontClass, className)}
      placeholderTextColorClassName={placeholderTextColorClassName}
      selectionColorClassName={selectionColorClassName}
      cursorColorClassName={cursorColorClassName}
      {...props}
      {...ariaProps}
    />
  );
}
