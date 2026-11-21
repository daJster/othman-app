import { Gesture } from 'react-native-gesture-handler';
import {
  resolveSwipe,
  SWIPE_DISTANCE,
  SWIPE_VELOCITY,
  type SwipeAxis,
  type SwipeDirection,
} from './swipe';

/**
 * A horizontal or vertical swipe for any component.
 *
 * The hook returns the configured pan gesture only; the caller attaches it with
 * `<GestureDetector>`. That keeps one gesture vocabulary in the app and leaves
 * the caller free to compose it with long-press, tap, or a nested native
 * scroller later.
 *
 * The callback reports the physical direction — `left`, `right`, `up`, `down` —
 * so language and reading order can never reverse it. A surface maps that
 * direction to its own meaning.
 */
export type UseSwipeGestureOptions = {
  /** Physical direction the finger moved. */
  onSwipe: (direction: SwipeDirection) => void;
  enabled?: boolean;
  axis?: SwipeAxis;
  /** Points travelled before a slow drag counts. */
  distance?: number;
  /** Points per second that count as a flick. */
  velocity?: number;
  /** Gesture-handler test id, used by the gesture test utilities. */
  testID?: string;
};

/** Horizontal intent before the gesture claims the touch. */
const ACTIVATION_DISTANCE = 12;

/** Vertical travel that hands the touch back to a scroller. */
const FAIL_DISTANCE = 24;

export function useSwipeGesture({
  onSwipe,
  enabled = true,
  axis = 'horizontal',
  distance = SWIPE_DISTANCE,
  velocity = SWIPE_VELOCITY,
  testID,
}: UseSwipeGestureOptions) {
  // Recreated per render on purpose: gesture-handler diffs callbacks against
  // the attached handler, so a fresh closure updates behaviour without a
  // reattach. Memoising would also hide the current `enabled` value from the
  // gesture after a boundary change.
  // Gesture-handler owns touch bookkeeping; the callback itself is deliberately
  // JS-side, because the consumers update React state and page models.
  const pan = Gesture.Pan().enabled(enabled).runOnJS(true);

  if (axis === 'horizontal') {
    pan
      .activeOffsetX([-ACTIVATION_DISTANCE, ACTIVATION_DISTANCE])
      .failOffsetY([-FAIL_DISTANCE, FAIL_DISTANCE]);
  } else {
    pan
      .activeOffsetY([-ACTIVATION_DISTANCE, ACTIVATION_DISTANCE])
      .failOffsetX([-FAIL_DISTANCE, FAIL_DISTANCE]);
  }

  if (testID) {
    pan.withTestId(testID);
  }

  return pan.onEnd((event) => {
    const direction = resolveSwipe(
      event.translationX,
      event.translationY,
      event.velocityX,
      event.velocityY,
      axis,
      distance,
      velocity,
    );

    if (direction) {
      onSwipe(direction);
    }
  });
}
