import { Link } from 'expo-router';
import { LinearGradient as RNLinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { withUniwind } from 'uniwind';
import { BrandMark } from '@/features/brand/brand-mark';
import type { AppHref } from '@/features/navigation/route-registry';
import { cn } from '@/ui/cn';
import { FOCUS_RING } from '@/ui/focus';
import { GlassFill, type GlassFillProps } from '@/ui/glass';
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

/**
 * The card's rim. A quarter-white, set inline because the utility sheet emits
 * no `/25` alpha variant — the class silently falls back to currentColor and the
 * border reads as solid white.
 */
export const CARD_BORDER_COLOR = 'rgba(255, 255, 255, 0.25)';

/** The content of the full-height card. */
export type HeroCardCopy = {
  /** Overline above the verse: "Verse of the Day". */
  verseTitle: string;
  verseText: string;
  verseReference: string;
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
export function GlassSurface({
  blurTarget,
}: Pick<GlassFillProps, 'blurTarget'> = {}) {
  return (
    <GlassFill
      weight="panel"
      radius="card"
      translucent
      blurTarget={blurTarget}
    />
  );
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
          'min-h-11 rounded-full bg-foreground px-6 py-3 active:opacity-85',
          FOCUS_RING,
        )}
      >
        <Text className="text-base font-semibold text-background">{label}</Text>
      </Pressable>
    </Link>
  );
}

/** The full card: the day's verse, then the one filled control and the inbox. */
export function HeroCardBody({
  verseTitle,
  verseText,
  verseReference,
  ctaLabel,
  ctaHref,
  interactive = true,
}: HeroCardCopy & { interactive?: boolean }) {
  return (
    <View className="gap-2 px-panel py-4 md:gap-3 md:px-6 md:py-5">
      {/*
       * The hero card is the verse now, not a cover for it. The overline is the
       * brass mark, the scripture is the only large type on the page, and the
       * reference closes it before the hairline — the same anatomy the verse
       * band used below the fold, at the size the film can hold.
       */}
      <Text
        variant="overline"
        className="text-center tracking-[0.3em] text-brass-ink"
      >
        {verseTitle}
      </Text>

      <Text
        family="quran"
        className="text-center text-2xl leading-relaxed text-foreground md:text-3xl"
      >
        {verseText}
      </Text>

      <Text variant="caption" tone="muted" className="text-center">
        {verseReference}
      </Text>

      <View className="mt-1 h-px bg-foreground/15" />

      {/*
       * The one filled control. The inbox lives in the bar, so the hero keeps
       * its single action instead of competing with a second control.
       */}
      <View className="mt-1 flex-row items-center justify-between gap-3">
        <HeroCta label={ctaLabel} href={ctaHref} interactive={interactive} />
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
 * already offered. On a phone the leading control is the inbox bell, because
 * the floating bell has handed over to the pinned card; on the web the brand
 * mark keeps its place beside the bar's own bell.
 */
export function HeroCardPinned({
  label,
  href,
  interactive = true,
  leading,
}: {
  label: string;
  href: AppHref;
  interactive?: boolean;
  /** Replaces the brand mark; the control is deliberately outside the link. */
  leading?: ReactNode;
}) {
  const body = (
    <>
      <Text
        numberOfLines={1}
        align="center"
        className="min-w-0 flex-1 text-sm font-semibold text-foreground"
      >
        {label}
      </Text>
      <Icon name="chevron-right" size={16} tone="muted" />
    </>
  );

  if (leading) {
    return (
      <View className="h-full w-full flex-row items-center">
        <View className="h-full justify-center ps-2">{leading}</View>
        <View className="mx-1 h-6 w-px shrink-0 bg-foreground/20" />
        <Link href={href} asChild>
          <Pressable
            pointerEvents={interactive ? 'auto' : 'none'}
            accessibilityRole="link"
            accessibilityLabel={label}
            className={cn(
              'h-full min-w-0 flex-1 flex-row items-center gap-3 px-3',
              FOCUS_RING,
            )}
          >
            {body}
          </Pressable>
        </Link>
      </View>
    );
  }

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
        {body}
      </Pressable>
    </Link>
  );
}
