import { Link } from 'expo-router';
import { LinearGradient as RNLinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';
import { withUniwind } from 'uniwind';
import { BrandMark } from '@/features/brand/brand-mark';
import type { AppHref } from '@/features/navigation/route-registry';
import { NoticesBell } from './notices-bell';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { GlassFill } from '@/ui/glass';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';

export const GlassGradient = withUniwind(RNLinearGradient);

/**
 * The hero card: one neutral, very light glass surface.
 *
 * The glass is a real material, not decoration: a film is moving behind the
 * card, and the blur is what keeps the copy legible while the frame changes
 * underneath. The wash is white, not a colour and not a dark scrim, so the
 * surface reads as white frosted glass and the film survives as light rather
 * than as a grey shadow.
 *
 * Contrast drove the numbers. A near-white tint at a high blur intensity,
 * topped with a 35% white layer, keeps the composite surface above 4.5:1
 * against canopy ink even over the film's darkest region. Keep the ratio if
 * you retune either layer.
 *
 * The card and the pinned pill share one radius: the 6-unit card radius
 * (24 px) turns the 56 px pill into a stadium, so the morph never changes the
 * curve.
 */
export const CARD_RADIUS_CLASS = 'rounded-card';

/** The content of the full-height card. */
export type HeroCardCopy = {
  opening: string;
  tagline: string;
  cohort: string;
  ctaLabel: string;
  ctaHref: AppHref;
};

/**
 * The frosted layers under the content.
 *
 * The weight is `panel`: a content surface over atmosphere, not an overlay.
 * The blur repeats the radius because Chromium does not clip a
 * `backdrop-filter` layer to an ancestor's rounded overflow, so without it the
 * frosted rectangle pokes a square corner out of the shell's curve.
 */
export function GlassSurface() {
  return <GlassFill weight="panel" radius="card" />;
}

export function HeroCta({
  label,
  href,
  interactive = true,
}: {
  label: string;
  href: AppHref;
  /** The other face of the morph is visible; this CTA is not. */
  interactive?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        pointerEvents={interactive ? 'auto' : 'none'}
        accessibilityRole="link"
        className={cn(
          'min-h-11 rounded-full bg-canopy px-6 py-3 active:opacity-85',
          FOCUS_RING,
        )}
      >
        <Text className="text-base font-semibold text-parchment">{label}</Text>
      </Pressable>
    </Link>
  );
}

/** The full card: basmalah, wordmark, tagline, cohort line, CTA and the bell. */
export function HeroCardBody({
  opening,
  tagline,
  cohort,
  ctaLabel,
  ctaHref,
  interactive = true,
}: HeroCardCopy & { interactive?: boolean }) {
  return (
    <View className="gap-2 px-panel py-4 md:gap-3 md:px-6 md:py-5">
      <Text
        family="quran"
        className="text-center text-xl leading-snug text-canopy md:text-2xl"
      >
        {opening}
      </Text>

      <View className="flex-row justify-start">
        <BrandMark
          className="h-9 w-16 md:h-11 md:w-20"
          surface="onLight"
          accessible={false}
        />
      </View>

      <Text className="max-w-xl text-xl leading-snug font-medium text-canopy md:text-2xl">
        {tagline}
      </Text>

      <View className="h-px bg-canopy/15" />

      <Text className="max-w-md text-sm leading-relaxed text-canopy">
        {cohort}
      </Text>

      {/*
       * The one filled control and the inbox, on one row: the CTA at the
       * reading start, the bell at the end. Putting the bell in the card rather
       * than on the film keeps the top corners for the film's own control, and
       * puts the inbox in the thumb zone on a phone.
       */}
      <View className="mt-1 flex-row items-center justify-between gap-3">
        <HeroCta label={ctaLabel} href={ctaHref} interactive={interactive} />
        <NoticesBell variant="panel" interactive={interactive} />
      </View>
    </View>
  );
}

/**
 * What survives the morph: the wordmark and the page's next thing.
 *
 * The pill used to repeat the CTA. It now reports state — the next session, the
 * next exam, or the page you left off on — because the one surface that is
 * always in view should answer "what now", not repeat an action the hero
 * already offered. It is still the way back in: the whole pill is the link.
 */
export function HeroCardPinned({
  label,
  href,
  interactive = true,
}: {
  label: string;
  href: AppHref;
  interactive?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        pointerEvents={interactive ? 'auto' : 'none'}
        accessibilityRole="link"
        accessibilityLabel={label}
        className={cn(
          'h-full w-full flex-row items-center gap-3 px-4',
          FOCUS_RING,
        )}
      >
        <BrandMark
          className="h-6 w-10 shrink-0"
          surface="onLight"
          accessible={false}
        />
        <Text
          numberOfLines={1}
          align="center"
          className="min-w-0 flex-1 text-sm font-semibold text-canopy"
        >
          {label}
        </Text>
        <Icon name="chevron-right" size={16} tone="muted" />
      </Pressable>
    </Link>
  );
}
