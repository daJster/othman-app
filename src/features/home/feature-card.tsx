import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/config';
import type { AppHref } from '@/features/navigation/route-registry';
import { useDirection } from '@/i18n';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

/**
 * One station on the circle line.
 *
 * The four destinations are a path, not four equal cards: a brass node, a
 * hairline connector and a single reading row. The line continues through the
 * group on every width, which is the phone translation of the hero ring. The
 * chevron mirrors with the interface direction; the row keeps a 44 pt target.
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
  const { isRTL } = useDirection();
  const chevron = isRTL ? 'chevron-left' : 'chevron-right';

  return (
    <Link href={href} asChild>
      <Pressable
        className={cn(
          'flex-row gap-4 active:opacity-70',
          FOCUS_RING,
          isRTL && 'flex-row-reverse',
        )}
      >
        <View className="w-10 items-center self-stretch">
          <View className="h-10 w-10 items-center justify-center rounded-full border border-brass/50 bg-background">
            <Icon name={icon} size={18} tone="primary" />
          </View>
          {!isLast ? <View className="w-px flex-1 bg-border" /> : null}
        </View>

        <View
          className={cn(
            'flex-1 flex-row items-start justify-between gap-4 pb-7',
            isRTL && 'flex-row-reverse',
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
            <Icon name={chevron} size={18} tone="muted" />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
