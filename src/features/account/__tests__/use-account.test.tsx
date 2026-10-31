import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { AccountData, AuthUser } from '@/core/types';
import { useAccount, useUpdateAccount } from '@/features/account/use-account';
import { profileService } from '@/services/profile';
import { queryKeys } from '@/services/query';

/**
 * `useAccount` is auth-ready but not auth-coupled: it takes the user, so these
 * tests can describe signed-in and signed-out without an `AuthProvider`.
 *
 * The profile service is mocked at its barrel, which also keeps the Firestore
 * SDK out of the test process entirely.
 */
jest.mock('@/services/profile', () => ({
  profileService: {
    getAccount: jest.fn(),
    update: jest.fn(),
    findByEmail: jest.fn(),
  },
}));

const service = profileService as unknown as {
  getAccount: jest.Mock;
  update: jest.Mock;
};

const USER: AuthUser = {
  uid: 'uid-1',
  email: 'student@example.test',
  displayName: 'Student',
  photoURL: null,
};

const ACCOUNT: AccountData = {
  uid: 'uid-1',
  email: 'student@example.test',
  displayName: 'Student',
  photoURL: null,
  role: 'user',
};

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      // `gcTime: 0` because `MutationCache.clear()` empties its map without
      // destroying the mutations, so their default 5-minute GC timers outlive
      // the suite and keep the Jest worker alive. Queries are safe: observers
      // clear their own timers on unmount.
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
  jest.clearAllMocks();
  client = makeClient();
});

afterEach(() => {
  client.clear();
});

describe('useAccount', () => {
  it('stays pending and does not fetch when signed out', async () => {
    const { result } = await renderHook(() => useAccount(null), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.state.status).toBe('pending');
    expect(service.getAccount).not.toHaveBeenCalled();
  });

  it('reports the merged account once the profile resolves', async () => {
    service.getAccount.mockResolvedValue(ACCOUNT);

    const { result } = await renderHook(() => useAccount(USER), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    if (result.current.state.status !== 'ready') throw new Error('unreachable');

    expect(result.current.state.data).toEqual(ACCOUNT);
    // The service receives the auth user: merging is the service's job, not
    // the hook's, and passing a uid would lose the fallback display name.
    expect(service.getAccount).toHaveBeenCalledWith(USER);
  });

  it('reports an error when the profile read fails', async () => {
    service.getAccount.mockRejectedValue(new Error('permission denied'));

    const { result } = await renderHook(() => useAccount(USER), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.state.status).toBe('error'));
  });

  it('keys the cache by uid, so two users never share an account', async () => {
    service.getAccount.mockImplementation(async (user: AuthUser) => ({
      ...ACCOUNT,
      uid: user.uid,
    }));

    const wrapper = makeWrapper(client);
    const first = await renderHook(() => useAccount(USER), { wrapper });
    await waitFor(() =>
      expect(first.result.current.state.status).toBe('ready'),
    );

    const other = { ...USER, uid: 'uid-2' };
    const second = await renderHook(() => useAccount(other), { wrapper });
    await waitFor(() =>
      expect(second.result.current.state.status).toBe('ready'),
    );

    expect(service.getAccount).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(queryKeys.account.byUid('uid-1'))).toMatchObject(
      {
        uid: 'uid-1',
      },
    );
    expect(client.getQueryData(queryKeys.account.byUid('uid-2'))).toMatchObject(
      {
        uid: 'uid-2',
      },
    );
  });
});

describe('useUpdateAccount', () => {
  it('writes the patch, then refetches instead of trusting the response', async () => {
    service.getAccount.mockResolvedValue(ACCOUNT);
    service.update.mockResolvedValue(undefined);

    const { result } = await renderHook(
      () => ({
        account: useAccount(USER),
        update: useUpdateAccount(USER.uid),
      }),
      { wrapper: makeWrapper(client) },
    );

    await waitFor(() =>
      expect(result.current.account.state.status).toBe('ready'),
    );

    await act(async () => {
      await result.current.update.mutateAsync({ displayName: 'New name' });
    });

    expect(service.update).toHaveBeenCalledWith('uid-1', {
      displayName: 'New name',
    });

    // `update` is partial and the server merges it with fields this call does
    // not know about, so the only correct next read is a refetch.
    await waitFor(() => expect(service.getAccount).toHaveBeenCalledTimes(2));
  });

  it('invalidates the account key on success', async () => {
    service.update.mockResolvedValue(undefined);
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    const { result } = await renderHook(() => useUpdateAccount('uid-1'), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ displayName: 'New name' });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.account.byUid('uid-1'),
    });
  });

  it('surfaces a failed write as a mutation error', async () => {
    service.update.mockRejectedValue(new Error('write failed'));

    const { result } = await renderHook(() => useUpdateAccount('uid-1'), {
      wrapper: makeWrapper(client),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ displayName: 'New name' }),
      ).rejects.toThrow('write failed');
    });

    // No optimistic update: the cached account must still be the old one.
    expect(
      client.getQueryData(queryKeys.account.byUid('uid-1')),
    ).toBeUndefined();
  });
});
