import type { ViewProps } from 'react-native';
import { View } from 'react-native';
import { cn } from './cn';
import { Text, type TextProps } from './text';

/**
 * Card surface.
 *
 * The web card relied on `ring-1 ring-foreground/10` and `py-4` with a separate
 * header/content split. On a phone the card *is* the content block, so padding
 * and gap are set once on the root and the sections only add rhythm.
 */

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn(
        'gap-3 rounded-xl border border-border bg-card p-4',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('gap-1', className)} {...props} />;
}

export function CardTitle({ className, ...props }: Omit<TextProps, 'variant'>) {
  return (
    <Text
      variant="subtitle"
      className={cn('text-card-foreground', className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: Omit<TextProps, 'variant'>) {
  return <Text variant="caption" className={className} {...props} />;
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('gap-2', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps) {
  return (
    <View className={cn('flex-row items-center gap-2', className)} {...props} />
  );
}
