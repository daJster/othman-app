import { useState, type ComponentProps } from 'react';
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
 *
 * `rows` is a count of lines, not pixels, and `autoGrow` lets the field follow
 * its content up to `maxRows` before it scrolls. A description that starts at
 * three lines and opens as it is written keeps a long form short without
 * hiding the text the reader is checking.
 */
const LINE_HEIGHT = 24;
/** The box's own vertical padding, independent of the text it holds. */
const FIELD_PADDING = 20;

export type TextareaProps = ComponentProps<typeof RNRTextarea> & {
  /** Lines visible before the field scrolls. */
  rows?: number;
  /** Grow with the content, up to `maxRows`. */
  autoGrow?: boolean;
  /** The tallest `autoGrow` will go. Ignored without `autoGrow`. */
  maxRows?: number;
};

export function Textarea({
  rows = 4,
  autoGrow = false,
  maxRows = 10,
  className,
  style,
  onContentSizeChange,
  ...props
}: TextareaProps) {
  const fontClass = useUiFontClass();
  const direction = useTextDirectionStyle();
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  const minHeight = rows * LINE_HEIGHT + FIELD_PADDING;
  const maxHeight = Math.max(rows, maxRows) * LINE_HEIGHT + FIELD_PADDING;
  const height = autoGrow
    ? Math.min(maxHeight, Math.max(minHeight, contentHeight ?? minHeight))
    : undefined;

  return (
    <RNRTextarea
      className={cn('text-start', fontClass, className)}
      style={[direction, autoGrow ? { height } : { minHeight }, style]}
      numberOfLines={rows}
      multiline
      textAlignVertical="top"
      scrollEnabled={autoGrow ? (contentHeight ?? 0) > maxHeight : true}
      onContentSizeChange={(event) => {
        setContentHeight(event.nativeEvent.contentSize.height);
        onContentSizeChange?.(event);
      }}
      placeholderTextColorClassName="accent-muted-foreground"
      selectionColorClassName="accent-primary"
      {...props}
    />
  );
}
