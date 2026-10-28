import type { DateKey, Meeting } from '@/core/types';
import {
  MEETINGS_CACHE_MAX_SIZE,
  clearMeetingsCache,
  getMeetingsFromCache,
  setMeetingsCache,
} from '@/core/domain/meetings/cache';
import { formatDateKey } from '@/core/domain/meetings/date-key';

function meeting(id: number): Meeting {
  return {
    id,
    title: `Meeting ${id}`,
    description: '',
    date: '2026-04-02',
    time: '2:00 PM',
    duration: '60 min',
    meetLink: '',
    status: 'scheduled',
    attendees: [],
    organizer: '',
    location: '',
  };
}

/** Sequential calendar days starting 2026-01-01. */
function day(index: number): DateKey {
  return formatDateKey(new Date(2026, 0, 1 + index));
}

describe('meetingsCache', () => {
  beforeEach(() => {
    clearMeetingsCache();
  });

  it('returns undefined for an uncached day and the stored list afterwards', () => {
    expect(getMeetingsFromCache(day(0))).toBeUndefined();

    const meetings = [meeting(1)];
    setMeetingsCache(day(0), meetings);

    expect(getMeetingsFromCache(day(0))).toBe(meetings);
  });

  it('replaces the value when the same day is set again', () => {
    setMeetingsCache(day(0), [meeting(1)]);
    setMeetingsCache(day(0), [meeting(2)]);

    expect(getMeetingsFromCache(day(0))).toEqual([meeting(2)]);
  });

  it('evicts only the oldest day once the size limit is reached', () => {
    for (let i = 0; i < MEETINGS_CACHE_MAX_SIZE; i += 1) {
      setMeetingsCache(day(i), [meeting(i)]);
    }

    setMeetingsCache(day(MEETINGS_CACHE_MAX_SIZE), [meeting(99)]);

    expect(getMeetingsFromCache(day(0))).toBeUndefined();
    expect(getMeetingsFromCache(day(1))).toBeDefined();
    expect(getMeetingsFromCache(day(MEETINGS_CACHE_MAX_SIZE))).toEqual([
      meeting(99),
    ]);
  });

  it('stays bounded no matter how many days are visited', () => {
    const total = MEETINGS_CACHE_MAX_SIZE * 3;

    for (let i = 0; i < total; i += 1) {
      setMeetingsCache(day(i), [meeting(i)]);
    }

    // Everything before the last window is gone, and the newest day is present.
    expect(
      getMeetingsFromCache(day(total - MEETINGS_CACHE_MAX_SIZE - 1)),
    ).toBeUndefined();
    expect(
      getMeetingsFromCache(day(total - MEETINGS_CACHE_MAX_SIZE)),
    ).toBeDefined();
    expect(getMeetingsFromCache(day(total - 1))).toEqual([meeting(total - 1)]);
  });

  it('clears every entry', () => {
    setMeetingsCache(day(0), [meeting(1)]);
    clearMeetingsCache();

    expect(getMeetingsFromCache(day(0))).toBeUndefined();
  });
});
