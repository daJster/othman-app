import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import type { AccountData, AuthUser } from '@/core/types';
import AccountScreen from '@/app/(tabs)/account';
import { profileService } from '@/services/profile';
import {
  createFakeAuthService,
  makeTestQueryClient,
  TestProviders,
} from '@/test-utils/auth';

/**
 * The screen is tested end-to-end through the real `useCurrentAccount` query and
 * a real `AuthProvider` backed by a fake service; only the backend repository is
 * faked. That is deliberate: the signed-out branch and the post-sign-out
 * redirect are the two things a screen test is most likely to get wrong (a
 * disabled query is `pending`, not `empty`), and faking the hook would hide
 * exactly that.
 */
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockRedirect = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
    canGoBack: () => true,
  }),
  usePathname: () => '/account',
  Redirect: (props: { href: unknown }) => {
    mockRedirect(props.href);
    return null;
  },
}));

jest.mock('expo-router/head', () => () => null);

jest.mock('@/services/profile', () => ({
  profileService: {
    getAccount: jest.fn(),
    update: jest.fn(),
    findByEmail: jest.fn(),
  },
}));

// `AuthProvider` imports the platform barrel, which boots Firebase on import.
// The provider receives a fake service in these tests, so the real one is never
// used; stubbing the barrel keeps the SDK out of the process.
jest.mock('@/platform/auth', () => ({ authService: {} }));

const service = profileService as unknown as {
  getAccount: jest.Mock;
  update: jest.Mock;
};

const USER: AuthUser = {
  uid: 'demo-account',
  email: 'othman@kuttab.test',
  displayName: 'Othman Al-Farsi',
  photoURL: null,
};

const ACCOUNT: AccountData = {
  uid: 'demo-account',
  email: 'othman@kuttab.test',
  displayName: 'Othman Al-Farsi',
  photoURL: null,
  role: 'user',
  phoneNumber: '+212612345678',
};

let client: QueryClient;

async function renderScreen(authUser: AuthUser | null = USER) {
  const auth = createFakeAuthService(authUser);
  client = makeTestQueryClient();

  await render(
    <TestProviders client={client} service={auth}>
      <AccountScreen />
    </TestProviders>,
  );

  return auth;
}

beforeEach(() => {
  jest.clearAllMocks();
  service.getAccount.mockResolvedValue(ACCOUNT);
});

afterEach(() => {
  client?.clear();
});

describe('AccountScreen', () => {
  it('shows the loading state while the profile read is in flight', async () => {
    service.getAccount.mockReturnValue(new Promise(() => undefined));

    await renderScreen();

    expect(screen.getByText('Loading…')).toBeTruthy();
    // Signed out is a *different* state; it must not flash while loading.
    expect(screen.queryByText('You are signed out')).toBeNull();
  });

  it('renders the profile header and the settings rows once loaded', async () => {
    await renderScreen();

    await waitFor(() =>
      expect(screen.getByText('Othman Al-Farsi')).toBeTruthy(),
    );

    expect(screen.getByText('othman@kuttab.test')).toBeTruthy();
    expect(screen.getByText('Student')).toBeTruthy();
    expect(screen.getByText('Progress')).toBeTruthy();
    expect(screen.getByText('Your memorisation over time')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
    // The demo affordance is gone from the production screen.
    expect(
      screen.queryByText(
        'Demo account — replaced by sign-in in a later update.',
      ),
    ).toBeNull();
  });

  it('opens the edit sheet, the progress screen and about', async () => {
    await renderScreen();
    await waitFor(() =>
      expect(screen.getByText('Othman Al-Farsi')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByTestId('account-edit-button'));
    expect(mockPush).toHaveBeenCalledWith('/account/edit');

    await fireEvent.press(screen.getByTestId('account-progress-row'));
    expect(mockPush).toHaveBeenCalledWith('/account/progress');

    await fireEvent.press(screen.getByTestId('account-about-row'));
    expect(mockPush).toHaveBeenCalledWith('/about');
  });

  it('offers the query retry when the profile read fails', async () => {
    service.getAccount.mockRejectedValueOnce(new Error('offline'));
    service.getAccount.mockResolvedValueOnce(ACCOUNT);

    await renderScreen();

    await waitFor(() =>
      expect(screen.getByText('Something went wrong')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText('Try again'));

    await waitFor(() =>
      expect(screen.getByText('Othman Al-Farsi')).toBeTruthy(),
    );
  });

  it('asks before signing out, then leaves the private route', async () => {
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);

    const auth = await renderScreen();
    await waitFor(() =>
      expect(screen.getByText('Othman Al-Farsi')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByTestId('account-sign-out-row'));

    expect(alert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alert.mock.calls[0];
    expect(title).toBe('Sign out?');
    expect(message).toBe('You can sign back in at any time.');

    // The destructive action is the second button; the first keeps the session.
    const confirm = buttons?.[1];
    expect(confirm?.style).toBe('destructive');

    await act(async () => {
      await confirm?.onPress?.();
    });

    expect(auth.signOutCalls).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(mockRedirect).toHaveBeenCalledWith({
        pathname: '/auth/sign-in',
        params: { returnTo: '/account' },
      }),
    );
    expect(screen.queryByText('Othman Al-Farsi')).toBeNull();
  });

  it('redirects a signed-out visitor to sign-in with a return destination', async () => {
    await renderScreen(null);

    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: '/auth/sign-in',
      params: { returnTo: '/account' },
    });
    expect(service.getAccount).not.toHaveBeenCalled();
  });
});
