import type { Story } from './stories';

/**
 * The day's suggestion.
 *
 * Selection is a calendar fact, not a random draw: the web build is rendered on
 * the server and hydrated in the browser, and a random pick would choose a
 * different surah in each place. The day of the year gives the same answer on
 * both sides for the whole day, and a stable rotation for tests and support.
 *
 * `dayOfYear % stories.length` is deliberately order-sensitive: appending a
 * story is safe, inserting one re-shuffles every day that follows.
 */
export function pickStory(stories: readonly Story[], date: Date): Story {
  if (stories.length === 0) {
    throw new Error('pickStory needs at least one story');
  }

  return stories[dayOfYear(date) % stories.length];
}

/**
 * The 1-based number of the day in its local calendar year.
 *
 * The difference is taken in UTC so a DST transition cannot make a local day
 * 23 or 25 hours long and skip or repeat an index. The year and month come from
 * the local date, so the rotation changes at the reader's midnight, not UTC's.
 */
function dayOfYear(date: Date): number {
  const year = date.getFullYear();
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, date.getMonth(), date.getDate());

  return Math.floor((current - start) / 86_400_000) + 1;
}
