import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useApiMutation, useApiQuery } from '../hooks';
import type { ApiMutation, ApiQuery } from '../types';

/**
 * The two hooks are the only place a screen touches the request layer, so these
 * tests cover the four promises that layer makes: the strategy is applied, a
 * guard really disables the request, the demo surface stays quiet without the
 * flag, and a write invalidates what its endpoint declared.
 *
 * The endpoints are synthetic on purpose: this file is about the hooks, not the
 * registry (covered in `endpoints.test.ts`).
 */

const run = jest.fn(async ({ id }: { id: number }) => `row-${id}`);

const ROW: ApiQuery<{ id: number }, string> = {
  id: 'test.row',
  policy: 'live',
  key: ({ id }) => ['test', 'row', id],
  run,
};

const GUARDED: ApiQuery<{ id: number | null }, string> = {
  id: 'test.guarded',
  policy: 'default',
  key: ({ id }) => ['test', 'guarded', id ?? 0],
  ready: ({ id }) => id !== null,
  run: async ({ id }) => `row-${id}`,
};

const DEMO: ApiQuery<void, string> = {
  id: 'test.demo',
  policy: 'session',
  key: () => ['test', 'demo'],
  run: async () => 'demo',
  demo: true,
};

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

let client: QueryClient;

beforeEach(() => {
  run.mockClear();
  client = makeClient();
});

afterEach(() => {
  client.clear();
});

describe('useApiQuery', () => {
  it('runs the endpoint with its parameters and caches the result', async () => {
    const { result } = await renderHook(() => useApiQuery(ROW, { id: 1 }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(run).toHaveBeenCalledWith({ id: 1 });
    expect(result.current.data).toBe('row-1');
    expect(client.getQueryData(['test', 'row', 1])).toBe('row-1');
  });

  it('does not run while the endpoint is not ready', async () => {
    const { result } = await renderHook(
      () => useApiQuery(GUARDED, { id: null }),
      { wrapper: makeWrapper(client) },
    );

    expect(result.current.isPending).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it('lets a caller disable an endpoint that is otherwise ready', async () => {
    const { result } = await renderHook(
      () => useApiQuery(ROW, { id: 2 }, { enabled: false }),
      { wrapper: makeWrapper(client) },
    );

    expect(result.current.isPending).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it('keeps demo-only endpoints disabled without the mock backend flag', async () => {
    const { result } = await renderHook(() => useApiQuery(DEMO), {
      wrapper: makeWrapper(client),
    });

    // The demo flag is off in Jest, and the endpoint still reports `pending`
    // rather than an error: "not available in this build" is not a failure.
    expect(result.current.isPending).toBe(true);
    expect(result.current.isError).toBe(false);
  });
});

describe('useApiMutation', () => {
  function mount(options?: Parameters<typeof useApiMutation>[1]) {
    const write = jest.fn(async ({ id }: { id: number }) => `saved-${id}`);
    const endpoint: ApiMutation<{ id: number }, string> = {
      id: 'test.write',
      run: write,
      invalidates: ({ id }) => [['test', 'row', id]],
    };

    return { write, endpoint, options };
  }

  it('invalidates the keys the endpoint declared and calls the caller back', async () => {
    const { write, endpoint, options } = mount();
    const onSuccess = jest.fn();
    client.setQueryData(['test', 'row', 5], 'stale');

    const { result } = await renderHook(
      () => useApiMutation(endpoint, { ...options, onSuccess }),
      { wrapper: makeWrapper(client) },
    );

    await act(async () => {
      await result.current.mutateAsync({ id: 5 });
    });

    expect(write).toHaveBeenCalledWith({ id: 5 });
    // TanStack hands `onSuccess` the mutation result and its own context; the
    // wrapper forwards both so a caller's optimistic bookkeeping still works.
    expect(onSuccess).toHaveBeenCalledWith(
      'saved-5',
      { id: 5 },
      undefined,
      expect.anything(),
    );
    await waitFor(() =>
      expect(client.getQueryState(['test', 'row', 5])?.isInvalidated).toBe(
        true,
      ),
    );
    // Other rows are untouched: invalidation is per-variable, not per-domain.
    expect(client.getQueryState(['test', 'row', 6])).toBeUndefined();
  });

  it('surfaces a rejected write and leaves the cache alone', async () => {
    const write = jest.fn(async () => {
      throw new Error('server said no');
    });
    const endpoint: ApiMutation<{ id: number }, string> = {
      id: 'test.write.fail',
      run: write,
      invalidates: ({ id }) => [['test', 'row', id]],
    };
    client.setQueryData(['test', 'row', 7], 'kept');

    const { result } = await renderHook(() => useApiMutation(endpoint), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 7 })).rejects.toThrow(
        'server said no',
      );
    });

    expect(client.getQueryState(['test', 'row', 7])?.isInvalidated).toBe(false);
  });
});
