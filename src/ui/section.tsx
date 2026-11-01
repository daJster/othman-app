import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import { cn } from './cn';
import { Text, type TextVariant } from './text';

/**
 * A page or group heading with its supporting line.
 *
 * The screens used to hand-write the same `gap-1` block around a title and a
 * muted description. `Section` keeps the heading semantics in one place; the
 * caller chooses the title scale, because a page title and a group title are
 * different levels in the type scale.
 */
export type SectionProps = ViewProps & {
  title: string;
  description?: string;
  titleVariant?: Extract<TextVariant, 'title' | 'heading' | 'label'>;
  descriptionVariant?: Extract<TextVariant, 'body' | 'caption'>;
  /** Heading level. Level 1 is the page title; level 2 is a group title. */
  level?: 1 | 2;
  titleTestID?: string;
};

export function Section({
  title,
  description,
  titleVariant = 'title',
  descriptionVariant = 'body',
  level = 1,
  titleTestID,
  className,
  ...props
}: SectionProps) {
  const ariaLevel =
    level === 2 ? ({ 'aria-level': 2 } as Record<string, unknown>) : {};

  return (
    <View className={cn('gap-1', className)} {...props}>
      <Text
        variant={titleVariant}
        role={level === 2 ? 'heading' : undefined}
        accessibilityRole={level === 1 ? 'header' : undefined}
        testID={titleTestID}
        {...ariaLevel}
      >
        {title}
      </Text>
      {description ? (
        <Text variant={descriptionVariant} tone="muted">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
