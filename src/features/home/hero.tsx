import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { cn } from '@/ui/cn';
import { HEADING_ROLE, headingAriaLevel } from '@/ui/heading';
import { useIsWide } from '@/ui/layout';
import { HERO_BOX_CLASS } from '@/ui/ratio';
import { Text } from '@/ui/text';
import {
  CARD_RADIUS_CLASS,
  GlassSurface,
  HeroCardBody,
  type HeroCardCopy,
} from './hero-card';
import { HeroFilm } from './hero-film';
import { HeroParticles } from './hero-particles';

/**
 * Visually hidden but still in the accessibility tree. The hero's wordmark is
 * artwork, so the h1 text lives here instead.
 */
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  opacity: 0,
} as const;

/**
 * Home hero: the landing film.
 *
 * The page opens on a window rather than a diagram. A single graded film runs
 * edge to edge behind one frosted panel; the panel carries the basmalah, the
 * wordmark, the cohort promise and the one filled control. The glass is
 * neutral — very light grey, with no colour of its own — so the copy stays in
 * canopy ink while the film's monochrome light passes underneath. Brass starts
 * below the fold, where the circle lives.
 *
 * The window is capped at the page column (`max-w-6xl`, the width the web
 * navbar and `Page width="wide"` share) and centred: on a desktop the hero
 * reads as the top of the grid instead of stretching to the edges of the
 * monitor, while a phone below that width still gets a full-bleed film.
 *
 * The halqa ring is gone on purpose. It diagrammed a community the reader
 * cannot yet see, and it cost half the phone viewport to do it. The film does
 * the same work emotionally and the panel does it literally.
 *
 * Height is a ratio, not a step of fixed pixels: on the web it is 88% of the
 * small viewport (so a collapsing mobile toolbar cannot push the panel below
 * the fold), on native the film keeps a 9:16 window. The static web export
 * never reads `useWindowDimensions`, so the first paint and the hydrated frame
 * agree.
 *
 * The card rendered here is the layout ghost. `HeroScroll` measures it and
 * puts the real, morphing card above the scroll viewport at the same rect; this
 * copy is what keeps the first paint whole and reserves the composition.
 */
export type HeroProps = HeroCardCopy & {
  title: string;
  /** The morph overlay has taken over; the ghost must stop intercepting. */
  ghostHidden?: boolean;
  /** Reports the card's window rect so the overlay can land on it. */
  onCardRect?: (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
};

export function Hero({
  opening,
  title,
  tagline,
  cohort,
  ctaLabel,
  ctaHref,
  ghostHidden = false,
  onCardRect,
}: HeroProps) {
  const wide = useIsWide();
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const window = useWindowDimensions();

  const report = useCallback(() => {
    cardRef.current?.measureInWindow?.((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;

      onCardRect?.({ x, y, width, height });
    });
  }, [onCardRect]);

  // Orientation and browser resize move the card without changing its own
  // layout, so the ghost re-reports whenever the viewport changes.
  useEffect(() => {
    report();
  }, [report, window.width, window.height]);

  return (
    <View
      testID="hero-panel"
      className={cn(
        'relative mx-auto w-full max-w-6xl overflow-hidden rounded-b-card bg-canopy',
        HERO_BOX_CLASS,
      )}
    >
      <Text {...HEADING_ROLE} {...headingAriaLevel(1)} style={visuallyHidden}>
        {title}
      </Text>

      <HeroFilm />

      {/*
       * A black scrim rather than a canopy one: it has to sit over
       * footage whose grade is already close to the field, and a black
       * fade never leaves a seam against a token that shifted by a point.
       */}
      <LinearGradient
        colors={['rgba(3,10,7,0)', 'rgba(3,10,7,0.62)']}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <HeroParticles count={wide ? 26 : 14} />

      <View className="relative flex-1 justify-end px-gutter pb-section md:justify-center md:px-section md:py-section">
        <View className="w-full md:mx-auto md:max-w-6xl">
          <View
            ref={cardRef}
            testID="hero-card"
            onLayout={report}
            pointerEvents={ghostHidden ? 'none' : 'auto'}
            aria-hidden={ghostHidden}
            className={cn(
              'w-full overflow-hidden border border-white/50 shadow-2xl shadow-black/20',
              CARD_RADIUS_CLASS,
              'md:mr-auto md:max-w-md',
              ghostHidden && 'opacity-0',
            )}
          >
            <GlassSurface />

            <HeroCardBody
              opening={opening}
              tagline={tagline}
              cohort={cohort}
              ctaLabel={ctaLabel}
              ctaHref={ctaHref}
              interactive={!ghostHidden}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
