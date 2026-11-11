import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { FETCH_POLICIES, api, useApiQuery } from '@/api';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { DateKey, Meeting } from '@/core/types';
import { toAsyncResult, type AsyncResult } from '@/features/query/async-state';
import { meetingsService } from '@/services/meetings';
import { queryKeys } from '@/services/query';

/**
 * Meetings for one day.
 *
 * The service is already cache-first per day for the session. This query layer
 * adds what the service deliberately does not: a component subscription, a
 * background refetch policy, and a stable identity for the same day's data
 * across screens. The two caches do not fight — a refetch that hits the service
 * cache is cheap, and `useRefreshMeetings` clears both.
 *
 * The strategy itself is not decided here: `api.meetings.byDate` names the
 * `live` policy, because a meeting row goes stale while the user watches it.
 * `MEETINGS_STALE_TIME` is kept as the screen-visible expression of that
 * decision so a test can guard the number in one place.
 */
export const MEETINGS_STALE_TIME = FETCH_POLICIES.live.staleTime;

export function useMeetingsByDate(dateKey: DateKey): AsyncResult<Meeting[]> {
  const query = useApiQuery(api.meetings.byDate, { date: dateKey });

  return toAsyncResult(query, (meetings) => meetings.length === 0);
}

/**
 * Pull-to-refresh.
 *
 * Invalidates both layers, in order: the domain cache first, so the refetch the
 * query client triggers is a real network read rather than a replay of the
 * in-memory day. Returns a promise so a `RefreshControl` can await it.
 */
export function useRefreshMeetings(): () => Promise<void> {
  const client = useQueryClient();

  return useCallback(async () => {
    meetingsService.invalidate();
    await client.invalidateQueries({ queryKey: queryKeys.meetings.root });
  }, [client]);
}

/** How far back and forward the calendar marks session days. */
const DENSITY_DAYS_BACK = 45;
const DENSITY_DAYS_FORWARD = 120;

/**
 * Which days in the calendar's window hold a session, and how many.
 *
 * The month grid should be a map, not a blind fold: before this, a day with a
 * session and a day without one looked identical until you tapped each one.
 * The window is one read for a fixed span rather than 42 per-day reads, and it
 * is wide enough that ordinary browsing never leaves it.
 */
export function useMeetingDays(): ReadonlyMap<string, number> {
  const range = useMemo(() => {
    const now = new Date();
    const shift = (days: number) =>
      formatDateKey(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + days),
      );

    return { from: shift(-DENSITY_DAYS_BACK), to: shift(DENSITY_DAYS_FORWARD) };
  }, []);

  const query = useApiQuery(api.meetings.range, range);

  return useMemo(() => {
    const counts = new Map<string, number>();

    for (const meeting of query.data ?? []) {
      counts.set(meeting.date, (counts.get(meeting.date) ?? 0) + 1);
    }

    return counts;
  }, [query.data]);
}
