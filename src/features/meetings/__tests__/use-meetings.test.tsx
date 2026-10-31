import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { Meeting } from '@/core/types';
import {
  MEETINGS_STALE_TIME,
  useMeetingsByDate,
  useRefreshMeetings,
} from '@/features/meetings/use-meetings';
import { meetingsService } from '@/services/meetings';
import { queryKeys } from '@/services/query';

/**
 * The hook is the only place a screen gets meetings, so these tests cover the
 * four things a screen relies on: pending → ready, empty, error + retry, and
 * that a refetch actually reaches the service (not just the query cache).
 *
 * The service is mocked at its barrel — the domain cache, the HTTP client and
 * the repository are all P1.x concerns and are tested there.
 */
jest.mock('@/services/meetings', () => ({
  meetingsService: {
    listByDate: jest.fn(),
    invalidate: jest.fn(),
  },
}));

const service = meetingsService as unknown as {
  listByDate: jest.Mock;
  invalidate: jest.Mock;
};

const MEETING: Meeting = {
  id: 1,
  title: 'Tafsir',
  description: 'Weekly tafsir circle',
  date: '2026-10-24',
  time: '18:00',
  duration: '60',
  meetLink: 'https://example.test/meet',
  status: 'upcoming',
  attendees: [],
  organizer: 'Shaykh',
  location: 'Online',
};

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // No retries in tests: a rejected promise should surface as an error
        // immediately, not after two backoff timers.
        retry: false,
        // No garbage-collection timers to keep Jest's process alive.
        gcTime: Infinity,
      },
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
  jest.clearAllMocks();
  client = makeClient();
});

afterEach(() => {
  client.clear();
});

describe('useMeetingsByDate', () => {
  it('reports pending, then ready with the day', async () => {
    service.listByDate.mockResolvedValue([MEETING]);

    const { result } = await renderHook(() => useMeetingsByDate('2026-10-24'), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.state.status).toBe('pending');

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    if (result.current.state.status !== 'ready') throw new Error('unreachable');

    expect(result.current.state.data).toEqual([MEETING]);
    expect(service.listByDate).toHaveBeenCalledWith('2026-10-24');
  });

  it('reports empty when the day has no meetings', async () => {
    service.listByDate.mockResolvedValue([]);

    const { result } = await renderHook(() => useMeetingsByDate('2026-10-25'), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.state.status).toBe('empty'));
  });

  it('reports an error and retries through the service', async () => {
    service.listByDate
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce([MEETING]);

    const { result } = await renderHook(() => useMeetingsByDate('2026-10-24'), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    if (result.current.state.status !== 'error') throw new Error('unreachable');

    const retry = result.current.state.retry;

    await act(async () => {
      retry();
    });

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(service.listByDate).toHaveBeenCalledTimes(2);
  });

  it('serves a second consumer from the cache', async () => {
    service.listByDate.mockResolvedValue([MEETING]);

    const wrapper = makeWrapper(client);
    const first = await renderHook(() => useMeetingsByDate('2026-10-24'), {
      wrapper,
    });
    await waitFor(() =>
      expect(first.result.current.state.status).toBe('ready'),
    );

    const second = await renderHook(() => useMeetingsByDate('2026-10-24'), {
      wrapper,
    });
    await waitFor(() =>
      expect(second.result.current.state.status).toBe('ready'),
    );

    expect(service.listByDate).toHaveBeenCalledTimes(1);
  });

  it('shares its stale window with the query client', () => {
    // Guards against a later edit that shortens this to 0 by accident: the
    // value is a product decision (a meeting goes stale while you watch it).
    expect(MEETINGS_STALE_TIME).toBe(60_000);
  });
});

describe('useRefreshMeetings', () => {
  it('clears the domain cache and refetches the list', async () => {
    service.listByDate.mockResolvedValue([MEETING]);

    const { result } = await renderHook(
      () => ({
        query: useMeetingsByDate('2026-10-24'),
        refresh: useRefreshMeetings(),
      }),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() =>
      expect(result.current.query.state.status).toBe('ready'),
    );

    await act(async () => {
      await result.current.refresh();
    });

    // The domain cache is cleared first, so the invalidation triggers a real
    // service read rather than replaying the in-memory day.
    expect(service.invalidate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(service.listByDate).toHaveBeenCalledTimes(2));
  });

  it('invalidates the whole meetings prefix, not one day', async () => {
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    const { result } = await renderHook(() => useRefreshMeetings(), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current();
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.meetings.root,
    });
  });
});
