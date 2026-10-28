import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Screen-state contract for server data.
 *
 * A query exposes four booleans (`isPending`, `isError`, `isSuccess`, `isFetching`)
 * and one optional `data`. A screen that branches on those directly will
 * eventually render "empty" during the first load — the exact bug `ui/states.tsx`
 * exists to prevent. This module collapses the booleans into one discriminated
 * union where that combination is unrepresentable:
 *
 *  - `pending` — nothing resolved yet. Render `<Loading />`.
 *  - `error`   — failed, retryable. Render `<ErrorState onRetry={retry} />`.
 *  - `empty`   — resolved, nothing there. Render `<EmptyState />`.
 *  - `ready`   — resolved, content. Render the content.
 *
 * `isFetching` is deliberately *not* part of the union: a background refetch
 * must keep the content mounted (that is what the pull-to-refresh spinner is
 * for), so it rides alongside as a separate flag.
 *
 * The input is structural, not `UseQueryResult`, so the mapper can be tested
 * without a `QueryClient` and reused by any async source with the same shape.
 */
export type AsyncState<T> =
  | { status: 'pending' }
  | { status: 'error'; error: unknown; retry: () => void }
  | { status: 'empty' }
  | { status: 'ready'; data: T };

export type AsyncResult<T> = {
  state: AsyncState<T>;
  /** Any fetch in flight, including a refetch that keeps `state` at `ready`. */
  isFetching: boolean;
};

/**
 * The same union without `empty`.
 *
 * A query that has no emptiness rule can never resolve to `empty` (see
 * `toAsyncResult`), so a screen reading one would have to handle a state that
 * cannot happen — and would invite an `EmptyState` for a value that always
 * exists. `AsyncPresentResult` makes that branch unrepresentable instead.
 */
export type AsyncPresentResult<T> = {
  state: Exclude<AsyncState<T>, { status: 'empty' }>;
  isFetching: boolean;
};

export type AsyncQueryLike<T> = Pick<
  UseQueryResult<T>,
  'data' | 'error' | 'isError' | 'isPending' | 'isFetching' | 'refetch'
>;

/**
 * @param query   A query result (or anything shaped like one).
 * @param isEmpty Domain rule for "resolved but nothing to show" — usually
 *                `rows => rows.length === 0`. Defaults to never empty, because
 *                guessing would hide a real result.
 *
 * Two signatures: passing an `isEmpty` rule returns the full union (the result
 * may be `empty`), while omitting it returns `AsyncPresentResult`, where
 * `empty` cannot appear. The caller states the domain rule, and the type
 * follows without a cast.
 */
export function toAsyncResult<T>(
  query: AsyncQueryLike<T>,
): AsyncPresentResult<T>;
export function toAsyncResult<T>(
  query: AsyncQueryLike<T>,
  isEmpty: (data: T) => boolean,
): AsyncResult<T>;
export function toAsyncResult<T>(
  query: AsyncQueryLike<T>,
  isEmpty: (data: T) => boolean = () => false,
): AsyncResult<T> {
  if (query.isPending) {
    return { state: { status: 'pending' }, isFetching: query.isFetching };
  }

  if (query.isError) {
    return {
      state: {
        status: 'error',
        error: query.error,
        // `refetch` returns a promise; the caller is an onPress and ignores it.
        retry: () => void query.refetch(),
      },
      isFetching: query.isFetching,
    };
  }

  const data = query.data as T;

  if (isEmpty(data)) {
    return { state: { status: 'empty' }, isFetching: query.isFetching };
  }

  return { state: { status: 'ready', data }, isFetching: query.isFetching };
}
