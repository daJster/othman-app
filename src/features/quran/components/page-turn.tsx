import { type ReactNode, useLayoutEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';
import { cssNumber } from '../css-value';
import type { PageTurnDirection } from '../store/reader-store';
import { resolveSwipe, type SwipeDirection } from '../swipe';

/**
 * The page-turn gesture and the entrance animation for the page inside it.
 *
 * The store changes `page` the moment a swipe commits, so this component cannot
 * animate the *outgoing* page: it is already gone. What it animates is the
 * incoming page sliding into place from the side the reader came from —
 * forward (the next page, to the left in a mushaf) enters from the left,
 * backward enters from the right. That is the same motion the web reader used,
 * and it needs one transform on one view.
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
  onSwipe: (direction: SwipeDirection) => void;
  /** The animation finished; clear the pending direction. */
  onSettled: () => void;
  children: ReactNode;
};

/** How much of the finger's travel the page follows while dragging. */
const DRAG_RATIO = 0.25;

/** Time the band takes to return when a drag does not commit. */
const DRAG_SETTLE = 140;

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

  const slide = useSharedValue(0);
  const drag = useSharedValue(0);

  useLayoutEffect(() => {
    if (direction === null) {
      slide.value = 0;
      return;
    }

    slide.value = direction === 'forward' ? -width : width;
    slide.value = withTiming(0, { duration }, (finished) => {
      if (finished) runOnJS(onSettled)();
    });
  }, [direction, duration, onSettled, slide, width]);

  // Recreated per render on purpose. `Gesture.Pan()` is a plain object and
  // gesture-handler diffs the new gesture against the attached one by handler
  // name and worklet-ness (`needsToReattach`), so a page turn updates callbacks
  // rather than reattaching the handler. Memoising it would also mean passing
  // the shared value to a hook as a dependency, and the React Compiler lint
  // forbids mutating a value that has been handed to a hook — which is exactly
  // what a shared value is for.
  const pan = Gesture.Pan()
    // A horizontal intent is required before the gesture claims the touch,
    // so a vertical drag can still scroll (P5.4's chrome) instead of
    // turning a page.
    .activeOffsetX([-12, 12])
    .failOffsetY([-24, 24])
    // Named so `react-native-gesture-handler/jest-utils` can drive it in a
    // test without reaching into internals.
    .withTestId('page-turn')
    .onUpdate((event) => {
      drag.value = event.translationX * DRAG_RATIO;
    })
    .onEnd((event) => {
      drag.value = withTiming(0, { duration: DRAG_SETTLE });

      const turn = resolveSwipe(event.translationX, event.velocityX);
      if (turn) runOnJS(onSwipe)(turn);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value + drag.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[FILL, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
