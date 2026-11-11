import { useEffect, useMemo, useState } from 'react';
import { api, FETCH_POLICIES, useApiQuery } from '@/api';
import { toAsyncResult, type AsyncState } from '@/features/query/async-state';
import type { CircleItem } from '@/services/circle';
import {
  pickNewestNotice,
  pickNextExam,
  pickNextHalqa,
  pickNextUp,
} from './circle-projection';

/**
 * One read of the circle, projected four ways.
 *
 * The page asks four different questions of the same list — what is next, when
 * is the session, when is the exam, what is the news — and the answer to each
 * has to agree with the others. Projecting once here (rather than in each
 * component) is what keeps the pinned pill and the rail from disagreeing.
 *
 * `now` ticks once a minute so "Today" does not survive midnight. That is the
 * only timer on the page.
 */
export const CIRCLE_STALE_TIME = FETCH_POLICIES.live.staleTime;

export type CircleView = {
  state: AsyncState<CircleItem[]>;
  items: readonly CircleItem[];
  /** Soonest timed item inside the pill's horizon. */
  nextUp: CircleItem | null;
  nextHalqa: CircleItem | null;
  nextExam: CircleItem | null;
  newestNotice: CircleItem | null;
  now: Date;
};

export function useCircle(): CircleView {
  const query = useApiQuery(api.circle.list);

  const { state } = toAsyncResult(query);
  const now = useNow();

  const items = state.status === 'ready' ? state.data : EMPTY;
  const projections = useMemo(
    () => ({
      nextUp: pickNextUp(items, now),
      nextHalqa: pickNextHalqa(items, now),
      nextExam: pickNextExam(items, now),
      newestNotice: pickNewestNotice(items),
    }),
    [items, now],
  );

  return { state, items, now, ...projections };
}

const EMPTY: readonly CircleItem[] = [];

function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
