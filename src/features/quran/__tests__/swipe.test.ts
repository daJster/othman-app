import { resolveSwipe, SWIPE_DISTANCE, SWIPE_VELOCITY } from '../swipe';

/**
 * The mapping from a finger to a page.
 *
 * The mushaf reads right-to-left, so "next page" is to the *left* on screen.
 * These tests pin that down: getting it backwards turns the app into a book
 * that opens from the back, which is the first thing a reader would notice.
 */
describe('resolveSwipe', () => {
  it('treats a leftward drag as the next page', () => {
    expect(resolveSwipe(-SWIPE_DISTANCE, 0)).toBe('forward');
  });

  it('treats a rightward drag as the previous page', () => {
    expect(resolveSwipe(SWIPE_DISTANCE, 0)).toBe('backward');
  });

  it('ignores a slow drag shorter than the threshold', () => {
    expect(resolveSwipe(-SWIPE_DISTANCE + 1, 0)).toBeNull();
    expect(resolveSwipe(SWIPE_DISTANCE - 1, 0)).toBeNull();
    expect(resolveSwipe(0, 0)).toBeNull();
  });

  it('accepts a quick flick that barely moved', () => {
    expect(resolveSwipe(-8, -SWIPE_VELOCITY)).toBe('forward');
    expect(resolveSwipe(8, SWIPE_VELOCITY)).toBe('backward');
  });

  it('ignores a fast drag in the other direction', () => {
    // A long drag right followed by a flick left: the user changed their mind.
    expect(resolveSwipe(SWIPE_DISTANCE + 10, -SWIPE_VELOCITY)).toBe('forward');
  });
});
