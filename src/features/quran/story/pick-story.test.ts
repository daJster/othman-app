import { pickStory } from './pick-story';
import { STORIES } from './stories';

/**
 * The suggestion must be a calendar fact: stable for one day, different the
 * next, and never out of range when the year is longer than the list.
 *
 * The list is five entries, so a full rotation returns to the first story on
 * day 365 of a non-leap year (365 % 5 === 0).
 */
describe('pickStory', () => {
  it('returns the same story for the same day', () => {
    const morning = new Date(2026, 4, 17, 7, 30);
    const evening = new Date(2026, 4, 17, 21, 45);

    expect(pickStory(STORIES, morning)).toBe(pickStory(STORIES, evening));
  });

  it('changes story on the next day', () => {
    const today = new Date(2026, 4, 17);
    const tomorrow = new Date(2026, 4, 18);

    expect(pickStory(STORIES, tomorrow)).not.toBe(pickStory(STORIES, today));
  });

  it('wraps to the first story after a full rotation', () => {
    // 2026 is not a leap year, so 31 December is day 365 and 365 % 5 === 0.
    expect(pickStory(STORIES, new Date(2026, 11, 31))).toBe(STORIES[0]);
    expect(pickStory(STORIES, new Date(2027, 0, 1))).toBe(STORIES[1]);
  });
});
