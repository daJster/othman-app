import type { QueryClient } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { AccountData, AuthUser } from '@/core/types';
import EditAccountScreen from '@/app/account/edit';
import { profileService } from '@/services/profile';
import {
  createFakeAuthService,
  makeTestQueryClient,
  TestProviders,
} from '@/test-utils/auth';

/**
 * The edit sheet is tested through the route, not the form in isolation: the
 * interesting behaviour (pending blocks dismissal, success navigates back,
 * failure stays put) is the interaction between the form and the route.
 *
 * `usePreventRemove` is mocked because it needs the real navigation container;
 * the route only arms it while a write is in flight, and the UI-level guard
 * (disabled Cancel + a pending Save) is what these tests can observe.
 */
const mockBack = jest.fn();
const mockLaunchImageLibrary = jest.fn();
// Stable, like the real `useRouter()`: a new object per render would re-run the
// form's "close once saved" effect with a fresh `onSaved` identity.
const mockRouter = { push: jest.fn(), back: mockBack };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/account/edit',
  Redirect: () => null,
}));

jest.mock('expo-router/head', () => () => null);

jest.mock('expo-router/build/react-navigation/core/usePreventRemove', () => ({
  usePreventRemove: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibrary(...args),
}));

jest.mock('@/services/profile', () => ({
  DEMO_ACCOUNT_UID: 'demo-account',
  DEMO_ACCOUNT_EMAIL: 'othman@kuttab.test',
  profileService: {
    getAccount: jest.fn(),
    update: jest.fn(),
    findByEmail: jest.fn(),
  },
}));

// The real platform barrel boots Firebase; these tests inject a fake service.
jest.mock('@/platform/auth', () => ({ authService: {} }));

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

const ADMIN: AccountData = { ...ACCOUNT, role: 'superadmin' };

const USER: AuthUser = {
  uid: 'demo-account',
  email: 'othman@kuttab.test',
  displayName: 'Othman Al-Farsi',
  photoURL: null,
};

async function renderSheet(account: AccountData = ACCOUNT) {
  service.getAccount.mockResolvedValue(account);

  const client = makeTestQueryClient();
  const auth = createFakeAuthService(USER);
  await render(
    <TestProviders client={client} service={auth}>
      <EditAccountScreen />
    </TestProviders>,
  );

  await waitFor(() =>
    expect(screen.getByTestId('account-name-input')).toBeTruthy(),
  );

  return client;
}

let client: QueryClient | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  service.update.mockResolvedValue(undefined);
  mockLaunchImageLibrary.mockResolvedValue({ canceled: true });
  client = undefined;
});

afterEach(() => {
  client?.clear();
  jest.restoreAllMocks();
});

describe('EditAccountScreen', () => {
  it('starts from the account and keeps Save disabled until something changes', async () => {
    client = await renderSheet();

    expect(
      screen.getByRole('heading', { name: 'Edit profile' }),
    ).toHaveTextContent('Edit profile');
    expect(screen.getByLabelText('Display name')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Phone number')).toBeTruthy();
    expect(screen.getByTestId('account-name-input')).toHaveDisplayValue(
      'Othman Al-Farsi',
    );
    expect(screen.getByTestId('account-phone-input')).toHaveDisplayValue(
      '+212612345678',
    );
    expect(screen.getByTestId('account-email-input')).toHaveDisplayValue(
      'othman@kuttab.test',
    );
    expect(screen.getByTestId('account-edit-save')).toBeDisabled();
  });

  it('saves only the changed name, then closes the sheet', async () => {
    client = await renderSheet();

    await fireEvent.changeText(
      screen.getByTestId('account-name-input'),
      'Othman Al-Farsi Jr',
    );

    expect(screen.getByTestId('account-edit-save')).toBeEnabled();

    await fireEvent.press(screen.getByTestId('account-edit-save'));

    await waitFor(() =>
      expect(service.update).toHaveBeenCalledWith('demo-account', {
        displayName: 'Othman Al-Farsi Jr',
      }),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('normalizes the phone number before writing it', async () => {
    client = await renderSheet();

    await fireEvent.changeText(
      screen.getByTestId('account-phone-input'),
      '+212 6 00 00 00 00',
    );
    await fireEvent.press(screen.getByTestId('account-edit-save'));

    await waitFor(() =>
      expect(service.update).toHaveBeenCalledWith('demo-account', {
        phoneNumber: '+212600000000',
      }),
    );
  });

  it('shows a length error and keeps Save disabled for a one-letter name', async () => {
    client = await renderSheet();

    await fireEvent.changeText(screen.getByTestId('account-name-input'), 'A');

    expect(screen.getByText('Use between 2 and 60 characters.')).toBeTruthy();
    expect(screen.getByTestId('account-edit-save')).toBeDisabled();
  });

  it('rejects a phone number without a country code', async () => {
    client = await renderSheet();

    await fireEvent.changeText(
      screen.getByTestId('account-phone-input'),
      '0612345678',
    );

    expect(
      screen.getByText(
        'Use a country code and digits only, like +212612345678.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('account-edit-save')).toBeDisabled();
  });

  it('keeps the draft and reports a failed write instead of closing', async () => {
    service.update.mockRejectedValueOnce(new Error('write failed'));
    client = await renderSheet();

    await fireEvent.changeText(
      screen.getByTestId('account-name-input'),
      'New Name',
    );
    await fireEvent.press(screen.getByTestId('account-edit-save'));

    await waitFor(() =>
      expect(
        screen.getByText('Could not save your changes. Try again.'),
      ).toBeTruthy(),
    );
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByTestId('account-name-input')).toHaveDisplayValue(
      'New Name',
    );
  });

  it('discards the draft on Cancel without writing', async () => {
    client = await renderSheet();

    await fireEvent.changeText(
      screen.getByTestId('account-name-input'),
      'Discarded',
    );
    await fireEvent.press(screen.getByTestId('account-edit-cancel'));

    expect(service.update).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows the role as read-only text to a non-administrator', async () => {
    client = await renderSheet();

    expect(screen.queryByTestId('account-role-picker')).toBeNull();
    expect(screen.getByText('Student')).toBeTruthy();
    expect(
      screen.getByText('Only an administrator can change a role.'),
    ).toBeTruthy();
  });

  it('lets an administrator change the role and writes it', async () => {
    client = await renderSheet(ADMIN);

    expect(screen.getByTestId('account-role-picker')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('account-role-picker:admin'));
    expect(screen.getByTestId('account-edit-save')).toBeEnabled();

    await fireEvent.press(screen.getByTestId('account-edit-save'));

    await waitFor(() =>
      expect(service.update).toHaveBeenCalledWith('demo-account', {
        role: 'admin',
      }),
    );
  });

  it('adds a picked photo to the draft', async () => {
    mockLaunchImageLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg' }],
    });
    client = await renderSheet();

    await fireEvent.press(screen.getByTestId('account-change-photo'));

    expect(mockLaunchImageLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], allowsEditing: true }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('account-edit-save')).toBeEnabled(),
    );

    await fireEvent.press(screen.getByTestId('account-edit-save'));

    await waitFor(() =>
      expect(service.update).toHaveBeenCalledWith('demo-account', {
        photoURL: 'file:///photo.jpg',
      }),
    );
  });

  it('disables the fields and the actions while the write is pending', async () => {
    let resolveWrite: (() => void) | undefined;
    service.update.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveWrite = resolve;
      }),
    );
    client = await renderSheet();

    await fireEvent.changeText(
      screen.getByTestId('account-name-input'),
      'Pending Name',
    );
    await fireEvent.press(screen.getByTestId('account-edit-save'));

    await waitFor(() => expect(screen.getByText('Saving…')).toBeTruthy());
    expect(screen.getByTestId('account-edit-save')).toBeDisabled();
    expect(screen.getByTestId('account-edit-cancel')).toBeDisabled();
    expect(screen.getByTestId('account-name-input').props.editable).toBe(false);

    await act(async () => {
      resolveWrite?.();
    });

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });
});
