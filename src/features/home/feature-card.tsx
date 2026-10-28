import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/config';
import type { AppHref } from '@/features/navigation/route-registry';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * Destination row on Home.
 *
 * `Link asChild` rather than `router.push` so the destination is a real anchor
 * on web (middle-click, open in new tab) and a normal Expo Router transition on
 * native. The child is a plain `Pressable`, which keeps the 44 pt target and
 * the pressed state on a React Native component instead of a router wrapper.
 *
 * The icon sits in a 44 pt tile so the whole row keeps the platform's minimum
 * touch size even when the description wraps to two lines.
 */
export type FeatureCardProps = {
  href: AppHref;
  icon: IconName;
  title: string;
  description: string;
};

export function FeatureCard({
  href,
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-accent">
        <View className="h-11 w-11 items-center justify-center rounded-lg bg-secondary">
          <Icon name={icon} size={22} tone="primary" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text variant="subtitle">{title}</Text>
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
