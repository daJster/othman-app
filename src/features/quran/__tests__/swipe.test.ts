import type { SwipeDirection } from '@/ui/gestures/swipe';
import { pageTurnForSwipe } from '../swipe';

/**
 * The fixed mushaf mapping.
 *
 * The book is Arabic in every UI language, so a rightward thumb is the next
 * page and a leftward thumb the previous one — always. These cases pin that
 * down: getting it backwards turns the app into a book that opens from the
 * back, which is the first thing a reader would notice.
 */
describe('pageTurnForSwipe', () => {
  it('turns to the next page on a rightward swipe', () => {
    expect(pageTurnForSwipe('right')).toBe('forward');
  });

  it('turns to the previous page on a leftward swipe', () => {
    expect(pageTurnForSwipe('left')).toBe('backward');
  });

  it('ignores vertical swipes', () => {
    const vertical: SwipeDirection[] = ['up', 'down'];

    for (const direction of vertical) {
      expect(pageTurnForSwipe(direction)).toBeNull();
    }
  });
});
