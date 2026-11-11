import { useState } from 'react';
import { Platform } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { AppHref } from '@/features/navigation/route-registry';
import { cn } from '@/ui/cn';
import { useReducedMotion } from '@/ui/motion';
import { PIN_GAP, PILL_GUTTER, PILL_HEIGHT, PILL_MAX_WIDTH } from '@/ui/ratio';
import {
  CARD_RADIUS_CLASS,
  GlassGradient,
  GlassSurface,
  HeroCardBody,
  HeroCardPinned,
  type HeroCardCopy,
} from './hero-card';
import { MOTION } from './motion';

/**
 * The hero card, morphing into the pinned pill.
 *
 * One element does the whole move. It starts exactly over the invisible card
 * the hero reserves, follows the page while its top is above the fold, and from
 * the moment its top reaches the pin line it holds there and shrinks into the
 * pill. Nothing crossfades between two cards: the same shell changes size,
 * width and position, the full copy lifts away, and the wordmark and CTA rise
 * into place.
 *
 * The morph is not scrubbed by the scroll. Crossing the threshold starts one
 * spring that runs to completion on its own clock, so the card finishes the
 * move even if the finger stops; scrolling back past the release gap retargets
 * the same spring in the other direction. Scroll only decides *when* and
 * *where the card sits until it is pinned*, never the shape.
 *
 * `ReduceMotion.Never` on every animation here is deliberate: the visitor told
 * the OS to reduce motion, and this product's earlier decision was still to
 * play the hero film and this one transition. Reanimated otherwise silently
 * turns the spring into a jump, which is what made the card snap.
 *
 * `Animated.View` is a Uniwind component (1.7+), so every static style is a
 * className; only the geometry that runs on the UI thread lives in `style`.
 */

/**
 * Geometry, in shared modules. Re-exported because the scroll container and
 * the tests read them from here; the numbers themselves live in `ui/ratio` so
 * the pill and the control floor can never drift apart.
 */
export { PIN_GAP, PILL_GUTTER, PILL_HEIGHT, PILL_MAX_WIDTH };

/** Scroll distance above the trigger at which the pill expands again. */
const RELEASE_GAP = 24;

/**
 * The settle. Damping is deliberately under critical so the pill arrives with
 * a small squeeze (about 3%) instead of a dead stop; stiffness keeps the whole
 * move near 500 ms.
 *
 * `reduceMotion: Never` here is not a refusal to honour the preference: the
 * reduced path is chosen above, in `useAnimatedReaction`, where the spring is
 * replaced by a 160 ms crossfade. Reanimated's own `System` mode would snap,
 * which loses the state change.
 */
const SPRING = {
  ...MOTION.spring,
  reduceMotion: ReduceMotion.Never,
};

/**
 * The anticipation and the light pass, timed in milliseconds. The curves are
 * built inside the worklet: the Jest Reanimated mock only exposes a subset of
 * `Easing`, and a module-level `Easing.out(...)` would break every test that
 * imports the home screen.
 */
const LIFT_IN_MS = MOTION.liftIn;
const LIFT_OUT_MS = MOTION.liftOut;
const LIFT_SCALE = 0.018;
const SHEEN_MS = MOTION.sheen;

/**
 * The card floats above the ScrollView, so on the web every non-interactive
 * layer must be transparent to the pointer or the wheel never reaches the
 * page. `box-none` still lets the wrapper's children be targets, which is
 * enough for touch but not for CSS wheel handling; only the CTA re-enables
 * itself, so the rest of the surface passes through on both platforms.
 */
const PASSTHROUGH = Platform.OS === 'web' ? 'none' : 'box-none';

export type HeroMorphRect = {
  /** Distance from the top of the scroll content, not the viewport. */
  top: number;
  left: number;
  width: number;
  height: number;
};

export type HeroMorphCardProps = {
  copy: HeroCardCopy;
  /** What the pinned pill says: the next thing, or the page to resume. */
  pill: { label: string; href: AppHref };
  rect: HeroMorphRect;
  scrollY: SharedValue<number>;
  frameWidth: number;
  pillWidth: number;
};

export function HeroMorphCard({
  copy,
  pill,
  rect,
  scrollY,
  frameWidth,
  pillWidth,
}: HeroMorphCardProps) {
  const reduced = useReducedMotion();
  const [compact, setCompact] = useState(false);
  /** The logical state: 0 expanded, 1 compact. Drives the hysteresis. */
  const target = useSharedValue(0);
  /** The animated shape, 0…1. Runs on its own clock after the trigger. */
  const progress = useSharedValue(0);
  /** 0…1 anticipation scale, only on the way in. */
  const lift = useSharedValue(0);
  /** 0…1 position of the glass sheen. */
  const sheen = useSharedValue(0);

  useAnimatedReaction(
    () => scrollY.value,
    (y) => {
      const start = rect.top - PIN_GAP;

      if (target.value === 0 && y >= start) {
        target.value = 1;

        if (reduced) {
          progress.value = withTiming(1, {
            duration: MOTION.reduceMs,
            reduceMotion: ReduceMotion.Never,
          });
        } else {
          lift.value = withSequence(
            withTiming(1, {
              duration: LIFT_IN_MS,
              easing: Easing.out(Easing.quad),
              reduceMotion: ReduceMotion.Never,
            }),
            withTiming(0, {
              duration: LIFT_OUT_MS,
              easing: Easing.out(Easing.cubic),
              reduceMotion: ReduceMotion.Never,
            }),
          );
          sheen.value = 0;
          sheen.value = withTiming(1, {
            duration: SHEEN_MS,
            easing: Easing.bezier(0.3, 0, 0.2, 1),
            reduceMotion: ReduceMotion.Never,
          });
          progress.value = withSpring(1, SPRING);
        }
      } else if (target.value === 1 && y < start - RELEASE_GAP) {
        target.value = 0;

        if (reduced) {
          progress.value = withTiming(0, {
            duration: MOTION.reduceMs,
            reduceMotion: ReduceMotion.Never,
          });
        } else {
          // No anticipation on the way out: the card is growing back into the
          // page, and a second breath there would read as hesitation.
          lift.value = withTiming(0, {
            duration: LIFT_OUT_MS,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.Never,
          });
          sheen.value = 0;
          sheen.value = withTiming(1, {
            duration: SHEEN_MS,
            easing: Easing.bezier(0.3, 0, 0.2, 1),
            reduceMotion: ReduceMotion.Never,
          });
          progress.value = withSpring(0, SPRING);
        }
      }
    },
    [rect.top, reduced],
  );

  // The accessible tree cannot be animated: flip it at the visual midpoint,
  // where the compact content owns the card.
  useAnimatedReaction(
    () => progress.value > 0.55,
    (next, previous) => {
      if (next !== previous) runOnJS(setCompact)(next);
    },
  );

  const geometry = useAnimatedStyle(() => ({
    top: Math.max(rect.top - scrollY.value, PIN_GAP),
    // No CLAMP: the under-damped spring is allowed to overshoot the pill by a
    // few percent. That squeeze is the landing.
    left: interpolate(
      progress.value,
      [0, 1],
      [rect.left, (frameWidth - pillWidth) / 2],
    ),
    width: interpolate(progress.value, [0, 1], [rect.width, pillWidth]),
    height: interpolate(progress.value, [0, 1], [rect.height, PILL_HEIGHT]),
    transform: [{ scale: 1 + lift.value * LIFT_SCALE }],
  }));

  const fullStyle = useAnimatedStyle(() => {
    const t = interpolate(
      progress.value,
      [0, 0.42],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: 1 - t,
      transform: [{ translateY: -18 * t }, { scale: 1 - 0.025 * t }],
    };
  });

  const compactStyle = useAnimatedStyle(() => {
    const t = interpolate(
      progress.value,
      [0.44, 1],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: t,
      transform: [{ translateY: 18 * (1 - t) }, { scale: 0.88 + 0.12 * t }],
    };
  });

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(sheen.value, [0, 1], [-180, rect.width + 180]),
      },
      { rotate: '16deg' },
    ],
  }));

  return (
    <Animated.View
      testID="hero-morph"
      pointerEvents="box-none"
      className={cn(
        'absolute z-10 overflow-hidden border border-white/50 shadow-2xl shadow-black/20',
        CARD_RADIUS_CLASS,
      )}
      // The static geometry is the measured rect, so the first paint lands on
      // the card before the UI-thread style takes over.
      style={[
        {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        geometry,
      ]}
    >
      <GlassSurface />

      {/* A light pass along the glass, under the copy, clipped by the shell. */}
      <Animated.View
        pointerEvents="none"
        className="absolute -top-12 -bottom-12 left-0 w-20"
        style={sheenStyle}
      >
        <GlassGradient
          colors={[
            'rgba(132, 160, 170, 0)',
            'rgba(132, 160, 170, 0.22)',
            'rgba(255, 255, 255, 0.35)',
            'rgba(132, 160, 170, 0.22)',
            'rgba(132, 160, 170, 0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="h-full w-full"
        />
      </Animated.View>

      {/*
       * The full copy keeps its measured width while the shell narrows, so the
       * text never reflows during the morph; the shell clips it instead.
       */}
      <Animated.View
        className="absolute top-0 left-0"
        style={[{ width: rect.width - 2, height: rect.height - 2 }, fullStyle]}
        pointerEvents={compact ? 'none' : PASSTHROUGH}
        aria-hidden={compact}
      >
        <HeroCardBody {...copy} interactive={!compact} />
      </Animated.View>

      <Animated.View
        className="absolute inset-0 items-center justify-center"
        style={compactStyle}
        pointerEvents={compact ? PASSTHROUGH : 'none'}
        aria-hidden={!compact}
      >
        <HeroCardPinned
          label={pill.label}
          href={pill.href}
          interactive={compact}
        />
      </Animated.View>
    </Animated.View>
  );
}
