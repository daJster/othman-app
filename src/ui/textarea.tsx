import type { ComponentProps } from 'react';
import { Textarea as RNRTextarea } from '@/components/ui/textarea';
import { cn } from './cn';
import { useUiFontClass } from './font';
import { useTextDirectionStyle } from './text';

/**
 * Multi-line text field, backed by react-native-reusables.
 *
 * `Input` cannot stand in for this: a multi-line field needs a taller box, top
 * alignment and its own resize behaviour on web. The wrapper adds the app's
 * font and text direction, which RN does not inherit into a `TextInput`.
 */
export type TextareaProps = ComponentProps<typeof RNRTextarea>;

export function Textarea({ className, style, ...props }: TextareaProps) {
  const fontClass = useUiFontClass();
  const direction = useTextDirectionStyle();

  return (
    <RNRTextarea
      className={cn('min-h-24 text-start', fontClass, className)}
      style={[direction, style]}
      placeholderTextColorClassName="accent-muted-foreground"
      selectionColorClassName="accent-primary"
      {...props}
    />
  );
}
