import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
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
 * `staleTime` is one minute rather than the global five: "today" changes while
 * the user watches it, and a meeting that started two minutes ago should not
 * keep saying "starts soon" until the app is relaunched.
 */
export const MEETINGS_STALE_TIME = 60_000;

export function useMeetingsByDate(dateKey: DateKey): AsyncResult<Meeting[]> {
  const query = useQuery({
    queryKey: queryKeys.meetings.byDate(dateKey),
    queryFn: () => meetingsService.listByDate(dateKey),
    staleTime: MEETINGS_STALE_TIME,
  });

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
