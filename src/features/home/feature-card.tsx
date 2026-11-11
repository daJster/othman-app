import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/config';
import type { AppHref } from '@/features/navigation/route-registry';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * One station on the circle line.
 *
 * The four destinations are a path, not four equal cards: a brass node, a
 * hairline connector and a single reading row. The line continues through the
 * group on every width — it is the hero's only geometric echo now that the
 * study ring is gone, which is why the nodes stay brass: this is where the
 * page's one warm thread lives. The chevron mirrors with the interface
 * direction; the row keeps a 44 pt target.
 */
export type FeatureCardProps = {
  href: AppHref;
  icon: IconName;
  title: string;
  description: string;
  isLast?: boolean;
};

export function FeatureCard({
  href,
  icon,
  title,
  description,
  isLast = false,
}: FeatureCardProps) {
  // One physical layout for both languages: the row reads left to right in
  // both, so the chevron points right in both. Direction is a text property.
  return (
    <Link href={href} asChild>
      <Pressable className={cn('flex-row gap-4 active:opacity-70', FOCUS_RING)}>
        <View className="w-10 items-center self-stretch">
          <View className="h-10 w-10 items-center justify-center rounded-full border border-brass/50 bg-glass">
            <Icon name={icon} size={18} tone="primary" />
          </View>
          {!isLast ? <View className="w-px flex-1 bg-border" /> : null}
        </View>

        <View
          className={cn(
            'flex-1 flex-row items-start justify-between gap-4 pb-7',
            isLast && 'pb-0',
          )}
        >
          <View className="flex-1 gap-1">
            <Text variant="subtitle">{title}</Text>
            <Text variant="caption" tone="muted">
              {description}
            </Text>
          </View>
          <View className="pt-1">
            <Icon name="chevron-right" size={18} tone="muted" />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
