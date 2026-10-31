/**
 * Which way a horizontal swipe turns the page.
 *
 * A mushaf reads right-to-left, so the *next* page is the one on the left and a
 * leftward drag is "forward". This is fixed by the book, not by the interface
 * language: an English UI reading the same Arabic text still turns the same way.
 * Keeping the decision here — pure, and `'worklet'` so the gesture can call it on
 * the UI thread without shipping the whole function to JS — is what keeps the
 * mapping out of the component.
 *
 * Distance and velocity are both accepted: a slow, deliberate drag of one line
 * should not turn the page, and a quick flick that travels a few pixels should.
 */

export type SwipeDirection = 'forward' | 'backward';

/** Points travelled before a slow drag counts as a turn. */
export const SWIPE_DISTANCE = 48;

/** Points per second that count as a flick regardless of distance. */
export const SWIPE_VELOCITY = 500;

export function resolveSwipe(
  translationX: number,
  velocityX: number,
): SwipeDirection | null {
  'worklet';

  if (translationX <= -SWIPE_DISTANCE || velocityX <= -SWIPE_VELOCITY) {
    return 'forward';
  }

  if (translationX >= SWIPE_DISTANCE || velocityX >= SWIPE_VELOCITY) {
    return 'backward';
  }

  return null;
}
