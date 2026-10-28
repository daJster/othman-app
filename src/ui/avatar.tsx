import { View, type ViewProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';
import { Image } from './image';
import { Text } from './text';

/**
 * Avatar.
 *
 * Sizes are expressed in pixels (20/24/32/40) rather than the web's `h-6 w-6`
 * rem scale so a 24px attendee stack stays 24px regardless of the device's
 * text-size setting; the initials inside scale with the avatar, not the OS.
 *
 * Falls back to initials when there is no image — an empty circle reads as a
 * loading state, and a broken-image icon reads as a bug.
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
    <View
      accessibilityLabel={name ?? undefined}
      className={slots.root({ className })}
      {...props}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          contentFit="cover"
          transition={150}
          className="h-full w-full"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text className={slots.initials()}>{initials}</Text>
      )}
    </View>
  );
}
