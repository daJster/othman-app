import type { ComponentRef, Ref } from 'react';
import {
  TextInput,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { cn } from './cn';
import { useUiFontClass } from './font';

/**
 * Text input.
 *
 * Colour props (`placeholderTextColor`, `selectionColor`, `cursorColor`) are
 * not style objects, so Uniwind reaches them through the `*ClassName` props
 * with an `accent-` prefix. That is the only way to keep them theme-aware
 * without reading CSS variables and converting `oklch` by hand.
 *
 * Height is 44px, not the web's 32px — same tap-target reasoning as `Button`.
 *
 * `invalid` is both a visual state and a web semantics contract: it paints the
 * destructive border and emits `aria-invalid`, so a screen reader can tie the
 * error text to the field instead of announcing two unrelated nodes.
 */
const input = tv({
  base: 'w-full rounded-lg border bg-transparent px-3 text-base text-foreground',
  variants: {
    size: {
      md: 'h-11',
      lg: 'h-12',
    },
    invalid: {
      true: 'border-destructive',
      false: 'border-input focus:border-ring',
    },
  },
  defaultVariants: {
    size: 'md',
    invalid: false,
  },
});

export type InputProps = RNTextInputProps &
  VariantProps<typeof input> & {
    /** Red border + `aria-invalid` semantics (validation failed). */
    invalid?: boolean;
    ref?: Ref<ComponentRef<typeof TextInput>>;
  };

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

  return (
    <TextInput
      ref={ref}
      className={cn(input({ size, invalid }), fontClass, className)}
      placeholderTextColorClassName={placeholderTextColorClassName}
      selectionColorClassName={selectionColorClassName}
      cursorColorClassName={cursorColorClassName}
      {...props}
      {...({ 'aria-invalid': invalid || undefined } as Record<string, unknown>)}
    />
  );
}
