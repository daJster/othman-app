import { QueryClient } from '@tanstack/react-query';
import type { BackendEvent } from '@/platform/backend';
import { queryKeys } from '@/services/query';
import { meetingsService } from '@/services/meetings';
import { invalidateForEvent } from '../events';

/**
 * A server event is a *hint to refetch*, never a cache write. The mapping is
 * the part worth testing: which keys an event stales, and — for meetings — that
 * the service's own day cache is dropped first.
 *
 * That second half is not a detail. Meetings are read through two caches, so an
 * invalidation that only touches TanStack refetches from the domain cache and
 * hands the screen the same stale rows. The symptom is "live updates do not
 * work" while every request in the network tab returns 200.
 */

jest.mock('@/services/meetings', () => ({
  meetingsService: { invalidate: jest.fn() },
}));

const service = meetingsService as unknown as { invalidate: jest.Mock };

function event(type: string): BackendEvent {
  return { id: 1, type, payload: null, createdAt: '2026-11-11T10:00:00Z' };
}

let client: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  client.clear();
});

describe('invalidateForEvent', () => {
  it('drops the meetings domain cache before the query cache', async () => {
    client.setQueryData(queryKeys.meetings.byDate('2026-11-11'), [{ id: 1 }]);

    invalidateForEvent(client, event('meetings.created'));

    expect(service.invalidate).toHaveBeenCalledTimes(1);
    expect(
      client.getQueryState(queryKeys.meetings.byDate('2026-11-11'))
        ?.isInvalidated,
    ).toBe(true);
  });

  it('stales every meetings key, not one day', () => {
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    invalidateForEvent(client, event('meetings.updated'));

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.meetings.root,
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.backend.meetingsRoot,
    });
  });

  it('leaves the meetings cache alone for an unrelated domain', () => {
    client.setQueryData(queryKeys.meetings.byDate('2026-11-11'), [{ id: 1 }]);

    invalidateForEvent(client, event('account.updated'));

    expect(service.invalidate).not.toHaveBeenCalled();
    expect(
      client.getQueryState(queryKeys.meetings.byDate('2026-11-11'))
        ?.isInvalidated,
    ).toBe(false);
    expect(
      client.getQueryState(queryKeys.account.root)?.isInvalidated,
    ).toBeFalsy();
    expect(
      client.getQueryState(queryKeys.backend.accountRoot)?.isInvalidated,
    ).toBeFalsy();
  });

  it('falls back to the whole demo namespace for an unknown event', () => {
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    invalidateForEvent(client, event('something.else'));

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.backend.root,
    });
  });
});
