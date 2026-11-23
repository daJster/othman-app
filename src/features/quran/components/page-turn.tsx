import { type ReactNode, useLayoutEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import { useSwipeGesture } from '@/ui/gestures/use-swipe-gesture';
import { useReducedMotion } from '@/ui/motion';
import { cssNumber } from '../css-value';
import type { PageTurnDirection } from '../store/reader-store';
import { pageTurnForSwipe, type PageTurnSwipe } from '../swipe';

/**
 * The page-turn gesture and the entrance animation for the page inside it.
 *
 * **The gesture is the app's shared swipe hook.** `useSwipeGesture` owns the
 * activation thresholds and reports a physical direction; the reader maps it
 * with `pageTurnForSwipe`, where a rightward thumb is next and a leftward thumb
 * is previous in every language. The drag rubber band is the one reader-local
 * addition: it is attached to the returned gesture, so direction feedback stays
 * without forking the swipe contract.
 *
 * **The entrance is the reader's authored moment.** The store changes `page`
 * the moment a swipe commits, so this component cannot animate the outgoing
 * page: it is already gone. What it animates is the incoming page arriving from
 * the side the reader came from — forward (the next page, to the left in a
 * mushaf) enters from the left, backward enters from the right. A small
 * exponential ease-out over the motion token is what makes the arrival read as
 * a page settling rather than a frame swap.
 *
 * The parent remounts this component per page (`key={page}`), which is what
 * makes the first frame of a turn the start of the animation: `useLayoutEffect`
 * writes the offset before paint, so the new page never flashes at rest.
 *
 * The drag itself is a rubber band (a quarter of the finger's travel) rather
 * than the page following the finger. Following it would show the background —
 * the next page is not rendered behind the current one — and a two-page
 * carousel is a different component from this one. The band gives direction
 * feedback; the animation gives the arrival.
 */

export type PageTurnProps = {
  direction: PageTurnDirection;
  onSwipe: (direction: PageTurnSwipe) => void;
  /** The animation finished; clear the pending direction. */
  onSettled: () => void;
  children: ReactNode;
};

/** How much of the finger's travel the page follows while dragging. */
const DRAG_RATIO = 0.25;

/** Time the band takes to return when a drag does not commit. */
const DRAG_SETTLE = 140;

/** Reduced motion keeps the turn and drops the travel: a short crossfade. */
const REDUCED_MOTION_DURATION = 180;

/** Default when the stylesheet has not loaded (`--motion-page-turn`). */
const FALLBACK_DURATION = 260;

const FILL = { flex: 1 } as const;

export function PageTurn({
  direction,
  onSwipe,
  onSettled,
  children,
}: PageTurnProps) {
  const { width } = useWindowDimensions();
  const [durationToken] = useCSSVariable(['--motion-page-turn']);
  const duration = cssNumber(durationToken, FALLBACK_DURATION);
  const reducedMotion = useReducedMotion();

  const slide = useSharedValue(0);
  const opacity = useSharedValue(1);
  const drag = useSharedValue(0);

  useLayoutEffect(() => {
    if (direction === null) {
      slide.value = 0;
      opacity.value = 1;
      return;
    }

    if (reducedMotion) {
      slide.value = 0;
      opacity.value = 0;
      opacity.value = withTiming(
        1,
        { duration: REDUCED_MOTION_DURATION, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(onSettled)();
        },
      );
      return;
    }

    slide.value = direction === 'forward' ? -width : width;
    opacity.value = 1;
    // Exponential ease-out: the page is on screen almost immediately and
    // settles into place, instead of holding a blank frame while an ease-in
    // accelerates.
    slide.value = withTiming(
      0,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onSettled)();
      },
    );
  }, [direction, duration, onSettled, opacity, reducedMotion, slide, width]);

  // The shared hook returns the configured pan; the band is attached to it so
  // the reader keeps direction feedback without hand-rolling the gesture. The
  // hook's own `onEnd` commit is untouched — `onFinalize` only returns the
  // rubber band (it also covers a cancelled drag).
  const pan = useSwipeGesture({
    axis: 'horizontal',
    testID: 'page-turn',
    onSwipe: (physical) => {
      const turn = pageTurnForSwipe(physical);

      if (turn) onSwipe(turn);
    },
  })
    .onUpdate((event) => {
      'worklet';

      drag.value = event.translationX * DRAG_RATIO;
    })
    .onFinalize(() => {
      'worklet';

      drag.value = withTiming(0, {
        duration: DRAG_SETTLE,
        easing: Easing.out(Easing.quad),
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: slide.value + drag.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[FILL, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
