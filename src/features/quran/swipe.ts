import type { SwipeDirection } from '@/ui/gestures/swipe';

/**
 * Which way a horizontal swipe turns the page.
 *
 * The mushaf is Arabic in every interface language, so the rule is fixed by the
 * book, not by the UI: a rightward thumb turns to the *next* page and a leftward
 * thumb to the *previous* one, always. The app's shared swipe resolver reports
 * only the physical direction (`left`/`right`); this is the reader's mapping of
 * that direction onto reading order.
 *
 * The store still names the turn `forward`/`backward` by reading order, which is
 * what lets the page-turn animation stay free of `if (isRtl)`.
 */

export type PageTurnSwipe = 'forward' | 'backward';

export function pageTurnForSwipe(
  direction: SwipeDirection,
): PageTurnSwipe | null {
  if (direction === 'right') return 'forward';
  if (direction === 'left') return 'backward';

  return null;
}
