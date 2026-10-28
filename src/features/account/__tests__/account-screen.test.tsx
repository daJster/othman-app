import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import type { AccountData } from '@/core/types';
import AccountScreen from '@/app/(tabs)/account';
import {
  resetDemoSession,
  signOutDemoSession,
} from '@/features/account/demo-session';
import { profileService } from '@/services/profile';

/**
 * The screen is tested end-to-end through the real `useCurrentAccount` query and
 * the demo session store; only the backend repository is faked. That is
 * deliberate: the signed-out branch is the one thing a screen test is most
 * likely to get wrong (a disabled query is `pending`, not `empty`), and faking
 * the hook would hide exactly that.
 */
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('expo-router/head', () => () => null);

jest.mock('@/services/profile', () => ({
  DEMO_ACCOUNT_UID: 'demo-account',
  DEMO_ACCOUNT_EMAIL: 'othman@kuttab.test',
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

const ACCOUNT: AccountData = {
  uid: 'demo-account',
  email: 'othman@kuttab.test',
  displayName: 'Othman Al-Farsi',
  photoURL: null,
  role: 'user',
  phoneNumber: '+212612345678',
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
  jest.clearAllMocks();
  resetDemoSession();
  service.getAccount.mockResolvedValue(ACCOUNT);
  client = makeClient();
});

afterEach(() => {
  client.clear();
});

describe('AccountScreen', () => {
  it('shows the loading state while the profile read is in flight', async () => {
    service.getAccount.mockReturnValue(new Promise(() => undefined));

    await render(<AccountScreen />, { wrapper: makeWrapper(client) });

    expect(screen.getByText('Loading…')).toBeTruthy();
    // Signed out is a *different* state; it must not flash while loading.
    expect(screen.queryByText('You are signed out')).toBeNull();
  });

  it('renders the profile header and the settings rows once loaded', async () => {
    await render(<AccountScreen />, { wrapper: makeWrapper(client) });

    await waitFor(() =>
      expect(screen.getByText('Othman Al-Farsi')).toBeTruthy(),
    );

    expect(screen.getByText('othman@kuttab.test')).toBeTruthy();
    expect(screen.getByText('Student')).toBeTruthy();
    expect(screen.getByText('Progress')).toBeTruthy();
    expect(screen.getByText('Your memorisation over time')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
    expect(
      screen.getByText('Demo account — replaced by sign-in in a later update.'),
    ).toBeTruthy();
  });

  it('opens the edit sheet, the progress screen and about', async () => {
    await render(<AccountScreen />, { wrapper: makeWrapper(client) });
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

    await render(<AccountScreen />, { wrapper: makeWrapper(client) });

    await waitFor(() =>
      expect(screen.getByText('Something went wrong')).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText('Try again'));

    await waitFor(() =>
      expect(screen.getByText('Othman Al-Farsi')).toBeTruthy(),
    );
  });

  it('asks before signing out and then shows the signed-out state', async () => {
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);

    await render(<AccountScreen />, { wrapper: makeWrapper(client) });
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
      confirm?.onPress?.();
    });

    await waitFor(() =>
      expect(screen.getByText('You are signed out')).toBeTruthy(),
    );
    expect(screen.queryByText('Othman Al-Farsi')).toBeNull();
  });

  it('can sign back in with the demo account', async () => {
    signOutDemoSession();
    service.getAccount.mockResolvedValue(ACCOUNT);

    await render(<AccountScreen />, { wrapper: makeWrapper(client) });

    expect(screen.getByText('You are signed out')).toBeTruthy();

    await fireEvent.press(screen.getByText('Use the demo account'));

    await waitFor(() =>
      expect(screen.getByText('Othman Al-Farsi')).toBeTruthy(),
    );
  });
});
