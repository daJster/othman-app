import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { cn } from '@/ui/cn';
import { GlassPanel } from '@/ui/glass';
import { FOCUS_RING } from '@/ui/focus';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { HOME_LINKS } from './feature-links';

/**
 * The four destinations, demoted to a strip.
 *
 * They used to be the page's body: a heading that promised a circle above four
 * rows that were really the navigation. The rail now carries the circle, so
 * these go back to being what they are — shortcuts — and take one row instead
 * of four. The tab bar already offers Quran, Meetings and Account; the strip
 * earns its place by adding About and by keeping every intent one tap from the
 * bottom of the page.
 *
 * Order, icon and label all come from the route registry, so a destination can
 * never point at a route that no longer exists.
 */
export function DestinationStrip() {
  const { t } = useTranslation();

  return (
    <GlassPanel radius="panel" weight="panel" className="mt-6 flex-row p-1">
      {HOME_LINKS.map((route) => (
        <Link key={route.href} href={route.href} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t(route.titleKey)}
            className={cn(
              'min-h-14 flex-1 items-center justify-center gap-1.5 rounded-chip px-1 py-2 active:bg-accent',
              FOCUS_RING,
            )}
            testID={`home-link-${route.href.slice(1)}`}
          >
            <Icon name={route.icon} size={20} tone="muted" />
            <Text variant="caption" tone="muted" align="center">
              {t(route.titleKey)}
            </Text>
          </Pressable>
        </Link>
      ))}
    </GlassPanel>
  );
}
