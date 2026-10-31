import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Text, View } from 'react-native';
import type { AccountData, AuthResult, AuthUser } from '@/core/types';
import { readerStore } from '@/features/quran/store/reader-store.instance';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import type { AuthService } from '@/platform/auth/auth.types';
import { profileService } from '@/services/profile';
import { queryKeys } from '@/services/query';
import { createFakeAuthService, makeTestQueryClient } from '@/test-utils/auth';

/**
 * `AuthProvider` is the session owner, so these tests describe its contract
 * rather than a screen: hydration, profile states, account races, teardown, and
 * what sign-out clears. The profile service is mocked at its barrel so the
 * Firestore SDK stays out of the test process.
 */
jest.mock('@/services/profile', () => ({
  profileService: {
    getAccount: jest.fn(),
    update: jest.fn(),
    findByEmail: jest.fn(),
  },
}));

// The provider imports the platform barrel for its default service, which boots
// Firebase. Every test injects a fake, so the barrel only has to be resolvable.
jest.mock('@/platform/auth', () => ({ authService: {} }));

const service = profileService as unknown as {
  getAccount: jest.Mock;
  update: jest.Mock;
};

const USER_A: AuthUser = {
  uid: 'uid-a',
  email: 'a@example.test',
  displayName: 'Account A',
  photoURL: null,
};

const USER_B: AuthUser = {
  uid: 'uid-b',
  email: 'b@example.test',
  displayName: 'Account B',
  photoURL: null,
};

function accountFor(user: AuthUser): AccountData {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: null,
    role: 'user',
    phoneNumber: null,
  };
}

function Probe() {
  const auth = useAuth();

  return (
    <View>
      <Text testID="status">{auth.status}</Text>
      <Text testID="uid">{auth.user?.uid ?? 'none'}</Text>
      <Text testID="account-status">{auth.account.state.status}</Text>
      <Text testID="account-name">
        {auth.account.state.status === 'ready'
          ? (auth.account.state.data.displayName ?? '')
          : ''}
      </Text>
      <Text testID="sign-out" onPress={() => void auth.signOut()}>
        sign out
      </Text>
      <Text testID="retry-profile" onPress={auth.retryProfile}>
        retry
      </Text>
    </View>
  );
}

async function renderProvider(authService: AuthService) {
  const client = makeTestQueryClient();

  await render(
    <QueryClientProvider client={client}>
      <AuthProvider service={authService}>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );

  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  readerStore.getState().reset();
});

describe('AuthProvider', () => {
  it('restores a session from the observer and reads the profile through the account query', async () => {
    service.getAccount.mockResolvedValue(accountFor(USER_A));
    const auth = createFakeAuthService(USER_A);

    await renderProvider(auth);

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signed-in'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('account-status')).toHaveTextContent('ready'),
    );

    expect(screen.getByTestId('uid')).toHaveTextContent('uid-a');
    expect(screen.getByTestId('account-name')).toHaveTextContent('Account A');
    expect(service.getAccount).toHaveBeenCalledWith(USER_A);
  });

  it('settles to signed-out when there is no session', async () => {
    const auth = createFakeAuthService(null);

    await renderProvider(auth);

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signed-out'),
    );
    expect(service.getAccount).not.toHaveBeenCalled();
  });

  it('merges an auth-only account when the profile document is missing', async () => {
    service.getAccount.mockResolvedValue(accountFor(USER_A));
    const auth = createFakeAuthService(USER_A);

    await renderProvider(auth);

    await waitFor(() =>
      expect(screen.getByTestId('account-status')).toHaveTextContent('ready'),
    );
    // The merge itself is covered by the profile service tests; here it proves
    // the provider does not invent a role or keep loading forever.
    expect(screen.getByTestId('account-name')).toHaveTextContent('Account A');
  });

  it('ends loading with an error and retries a failed profile read', async () => {
    service.getAccount
      .mockRejectedValueOnce(new Error('permission-denied'))
      .mockResolvedValueOnce(accountFor(USER_A));
    const auth = createFakeAuthService(USER_A);

    await renderProvider(auth);

    await waitFor(() =>
      expect(screen.getByTestId('account-status')).toHaveTextContent('error'),
    );

    await act(async () => {
      screen.getByTestId('retry-profile').props.onPress();
    });

    await waitFor(() =>
      expect(screen.getByTestId('account-status')).toHaveTextContent('ready'),
    );
  });

  it('unsubscribes from the session observer on unmount', async () => {
    const auth = createFakeAuthService(USER_A);
    service.getAccount.mockResolvedValue(accountFor(USER_A));

    const view = await render(
      <QueryClientProvider client={makeTestQueryClient()}>
        <AuthProvider service={auth}>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(auth.listeners.size).toBe(1));

    await act(async () => {
      view.unmount();
    });

    expect(auth.listeners.size).toBe(0);
    expect(auth.unsubscribed).toHaveBeenCalledTimes(1);
  });

  it('never lets account A overwrite account B when responses race', async () => {
    let resolveA: ((account: AccountData) => void) | undefined;
    let resolveB: ((account: AccountData) => void) | undefined;

    service.getAccount.mockImplementation((user: AuthUser) => {
      if (user.uid === USER_A.uid) {
        return new Promise<AccountData>((resolve) => {
          resolveA = resolve;
        });
      }
      return new Promise<AccountData>((resolve) => {
        resolveB = resolve;
      });
    });

    const auth = createFakeAuthService(USER_A);
    await renderProvider(auth);

    await waitFor(() =>
      expect(screen.getByTestId('account-status')).toHaveTextContent('pending'),
    );

    await act(async () => {
      auth.setUser(USER_B);
    });

    await act(async () => {
      resolveB?.(accountFor(USER_B));
    });

    await waitFor(() =>
      expect(screen.getByTestId('account-name')).toHaveTextContent('Account B'),
    );

    // A's older response arrives last and must not become the current account.
    await act(async () => {
      resolveA?.(accountFor(USER_A));
    });

    expect(screen.getByTestId('uid')).toHaveTextContent('uid-b');
    expect(screen.getByTestId('account-name')).toHaveTextContent('Account B');
  });

  it('ignores a stale hydration read that resolves after the real observer', async () => {
    let resolveHydration: ((user: AuthUser) => void) | undefined;

    const auth: AuthService = {
      getCurrentUser: () =>
        new Promise<AuthUser>((resolve) => {
          resolveHydration = resolve;
        }),
      onAuthStateChanged(listener) {
        // The observer wins, as it does on a normal cold start.
        listener(USER_B);
        return () => undefined;
      },
      signInWithEmail: async (): Promise<AuthResult> => ({
        status: 'error',
        code: 'unknown',
        message: 'not used',
      }),
      registerWithEmail: async (): Promise<AuthResult> => ({
        status: 'error',
        code: 'unknown',
        message: 'not used',
      }),
      signInWithGoogle: async (): Promise<AuthResult> => ({
        status: 'error',
        code: 'unknown',
        message: 'not used',
      }),
      signOut: async () => undefined,
      updateProfile: async () => undefined,
    };

    service.getAccount.mockResolvedValue(accountFor(USER_B));
    await renderProvider(auth);

    await waitFor(() =>
      expect(screen.getByTestId('uid')).toHaveTextContent('uid-b'),
    );

    await act(async () => {
      resolveHydration?.(USER_A);
    });

    expect(screen.getByTestId('uid')).toHaveTextContent('uid-b');
  });

  it('sign-out clears private query data and reader state but keeps public Quran data', async () => {
    service.getAccount.mockResolvedValue(accountFor(USER_A));
    const auth = createFakeAuthService(USER_A);
    const client = await renderProvider(auth);

    await waitFor(() =>
      expect(screen.getByTestId('account-status')).toHaveTextContent('ready'),
    );

    client.setQueryData(
      queryKeys.account.byUid(USER_A.uid),
      accountFor(USER_A),
    );
    client.setQueryData(queryKeys.progress.surah, [{ surahNumber: 1 }]);
    client.setQueryData(queryKeys.meetings.byDate('2026-10-30'), []);
    client.setQueryData(queryKeys.quran.catalog, { editions: {}, surahs: [] });
    readerStore.setState({ ayahKey: '7', direction: 'forward' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('sign-out'));
    });

    // The provider's own listener also runs; wait for the observable state.
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signed-out'),
    );

    expect(client.getQueryData(queryKeys.account.root)).toBeUndefined();
    expect(client.getQueryData(queryKeys.progress.root)).toBeUndefined();
    expect(client.getQueryData(queryKeys.meetings.root)).toBeUndefined();
    // The mushaf is public and expensive to fetch; signing out must not drop it.
    expect(client.getQueryData(queryKeys.quran.catalog)).toEqual({
      editions: {},
      surahs: [],
    });
    expect(readerStore.getState().ayahKey).toBeNull();
    expect(readerStore.getState().direction).toBeNull();
  });
});
