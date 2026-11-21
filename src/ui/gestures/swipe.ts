/**
 * Physical swipe resolution.
 *
 * The result names where the finger went, never what that means to a surface.
 * Language and reading order stay out of this module: a leftward thumb is
 * "left" in Arabic and English alike, and the caller decides whether that is
 * next, previous, or a no-op.
 *
 * Distance and velocity are both accepted: a deliberate drag has to travel far
 * enough to count, while a short flick is still a swipe.
 */

export type SwipeAxis = 'horizontal' | 'vertical';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export type SwipeThresholds = {
  /** Points travelled before a slow drag counts as a swipe. */
  distance: number;
  /** Points per second that count as a flick regardless of distance. */
  velocity: number;
};

export const SWIPE_DISTANCE = 48;
export const SWIPE_VELOCITY = 450;

export function resolveSwipe(
  translationX: number,
  translationY: number,
  velocityX: number,
  velocityY: number,
  axis: SwipeAxis,
  distance: number = SWIPE_DISTANCE,
  velocity: number = SWIPE_VELOCITY,
): SwipeDirection | null {
  'worklet';

  if (axis === 'horizontal') {
    if (translationX <= -distance || velocityX <= -velocity) return 'left';
    if (translationX >= distance || velocityX >= velocity) return 'right';

    return null;
  }

  if (translationY <= -distance || velocityY <= -velocity) return 'up';
  if (translationY >= distance || velocityY >= velocity) return 'down';

  return null;
}
