import type { ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import {
  Avatar as RNRAvatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { cn } from './cn';
import { Text } from './text';

/**
 * Avatar, backed by react-native-reusables.
 *
 * Sizes stay expressed in pixels (20/24/32/40/64) rather than RNR's `size-8`
 * default, so an attendee stack keeps its measure regardless of the device's
 * text-size setting. The primitive supplies the image/fallback state machine;
 * the fallback keeps the app's initials treatment.
 */
const avatar = tv({
  slots: {
    root: 'items-center justify-center overflow-hidden rounded-full bg-muted',
    initials: 'font-semibold text-muted-foreground',
  },
  variants: {
    size: {
      xs: { root: 'h-5 w-5', initials: 'text-[9px]' },
      sm: { root: 'h-6 w-6', initials: 'text-2xs' },
      md: { root: 'h-8 w-8', initials: 'text-xs' },
      lg: { root: 'h-10 w-10', initials: 'text-sm' },
      xl: { root: 'h-16 w-16', initials: 'text-lg' },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type AvatarSize = NonNullable<VariantProps<typeof avatar>['size']>;

export type AvatarProps = Omit<ViewProps, 'children'> & {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
};

function initialsOf(name: string | null | undefined): string {
  if (!name) return '';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export function Avatar({ src, name, size, className, ...props }: AvatarProps) {
  const initials = initialsOf(name);
  const slots = avatar({ size });

  return (
    <RNRAvatar
      alt={name ?? ''}
      accessibilityLabel={name ?? undefined}
      className={cn(slots.root(), className)}
      {...props}
    >
      {src ? <AvatarImage source={{ uri: src }} /> : null}
      <AvatarFallback className="items-center justify-center bg-muted">
        <Text className={slots.initials()}>{initials}</Text>
      </AvatarFallback>
    </RNRAvatar>
  );
}
