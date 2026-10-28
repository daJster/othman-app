import type { DateKey, Meeting } from '../../types';
import { getMeetingsFromCache, setMeetingsCache } from './cache';

export type FetchMeetingsFn = (dateKey: DateKey) => Promise<Meeting[]>;

export type FetchMeetingsErrorCallback = (error: Error) => void;
export type FetchMeetingsSuccessCallback = (meetings: Meeting[]) => void;

export async function fetchMeetingsForDate(
  dateKey: DateKey,
  fetchMeetings: FetchMeetingsFn,
  onSuccess?: FetchMeetingsSuccessCallback,
  onError?: FetchMeetingsErrorCallback,
): Promise<Meeting[]> {
  const cached = getMeetingsFromCache(dateKey);
  if (cached !== undefined) {
    onSuccess?.(cached);
    return cached;
  }

  try {
    const meetings = await fetchMeetings(dateKey);
    setMeetingsCache(dateKey, meetings);
    onSuccess?.(meetings);
    return meetings;
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error('Failed to fetch meetings');
    onError?.(err);
    throw err;
  }
}
