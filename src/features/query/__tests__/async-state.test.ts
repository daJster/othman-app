import {
  toAsyncResult,
  type AsyncQueryLike,
} from '@/features/query/async-state';

/**
 * The mapper is the contract every server-backed screen renders through, so it
 * is tested as a pure function: no QueryClient, no React, no timers.
 */
function query<T>(overrides: Partial<AsyncQueryLike<T>>): AsyncQueryLike<T> {
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    isFetching: false,
    refetch: jest.fn() as unknown as AsyncQueryLike<T>['refetch'],
    ...overrides,
  };
}

describe('toAsyncResult', () => {
  it('reports pending before anything resolves', () => {
    const result = toAsyncResult(
      query<string[]>({ isPending: true, isFetching: true }),
    );

    expect(result.state).toEqual({ status: 'pending' });
    expect(result.isFetching).toBe(true);
  });

  it('never reports empty while pending', () => {
    // The bug this union exists to prevent: `data` is `undefined` during the
    // first load, and `?(data.length)` would call that empty.
    const result = toAsyncResult(
      query<string[]>({ isPending: true, data: undefined }),
      (rows) => rows.length === 0,
    );

    expect(result.state.status).toBe('pending');
  });

  it('reports an error with a retry callback', () => {
    const refetch = jest.fn() as unknown as AsyncQueryLike<string[]>['refetch'];
    const error = new Error('offline');

    const result = toAsyncResult(
      query<string[]>({ isError: true, error, refetch }),
    );

    expect(result.state.status).toBe('error');
    if (result.state.status !== 'error') throw new Error('unreachable');
    expect(result.state.error).toBe(error);

    result.state.retry();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('reports empty only once the result has resolved', () => {
    const result = toAsyncResult(
      query<string[]>({ data: [] }),
      (rows) => rows.length === 0,
    );

    expect(result.state).toEqual({ status: 'empty' });
  });

  it('reports ready with the data', () => {
    const result = toAsyncResult(
      query<string[]>({ data: ['a'] }),
      (rows) => rows.length === 0,
    );

    expect(result.state).toEqual({ status: 'ready', data: ['a'] });
  });

  it('keeps the content while a background refetch runs', () => {
    // `isFetching` must not demote a ready screen to pending: that would
    // unmount the list on every pull-to-refresh.
    const result = toAsyncResult(
      query<string[]>({ data: ['a'], isFetching: true }),
    );

    expect(result.state.status).toBe('ready');
    expect(result.isFetching).toBe(true);
  });

  it('treats a result as non-empty by default', () => {
    // No domain rule supplied means "if the server returned it, show it".
    const result = toAsyncResult(query<string[]>({ data: [] }));

    expect(result.state).toEqual({ status: 'ready', data: [] });
  });
});
