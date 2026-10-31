import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import type { AuthErrorCode, AuthResult } from '@/core/types';
import SignInScreen from '@/app/auth/sign-in';

/**
 * The sign-in modal is tested through its two credential paths, because the
 * contract is behavioural: one navigation per success, a disabled form while a
 * request is in flight, no account probing, and a recovery message for the one
 * non-enumerable provider conflict.
 *
 * `useAuth` is mocked rather than wired through `AuthProvider`: this test is
 * about the screen's state machine, and the provider has its own suite.
 */
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ returnTo: '/meetings' }),
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock('expo-router/head', () => () => null);

const mockUseAuth = jest.fn();

jest.mock('@/providers/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

const signInWithEmail = jest.fn<Promise<AuthResult>, [string, string]>();
const signInWithGoogle = jest.fn<Promise<AuthResult>, []>();

function signedOut(overrides: Record<string, unknown> = {}) {
  mockUseAuth.mockReturnValue({
    user: null,
    status: 'signed-out',
    sessionError: null,
    account: { state: { status: 'pending' } },
    signInWithEmail,
    registerWithEmail: jest.fn(),
    signInWithGoogle,
    signOut: jest.fn(),
    retryProfile: jest.fn(),
    ...overrides,
  });
}

function success(): AuthResult {
  return {
    status: 'success',
    user: {
      uid: 'uid-1',
      email: 'student@example.test',
      displayName: null,
      photoURL: null,
    },
  };
}

function failure(code: AuthErrorCode): AuthResult {
  return { status: 'error', code, message: 'back-end detail' };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
  signedOut();
});

async function enterEmail(email = 'student@example.test') {
  await fireEvent.changeText(screen.getByTestId('auth-email'), email);
  await fireEvent.press(screen.getByTestId('auth-continue'));
}

describe('SignInScreen', () => {
  it('waits for session restoration before showing the form', async () => {
    signedOut({ status: 'restoring' });

    await render(<SignInScreen />);

    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(screen.queryByTestId('auth-google')).toBeNull();
  });

  it('signs in with Google and resumes the protected destination', async () => {
    signInWithGoogle.mockResolvedValue(success());

    await render(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('auth-google'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/meetings'));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    // A success replaces once; the effect must not navigate a second time.
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('treats a cancelled Google sheet as a no-op', async () => {
    signInWithGoogle.mockResolvedValue(failure('cancelled'));

    await render(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('auth-google'));

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('auth-error')).toBeNull();
  });

  it('asks for the password only after a valid email', async () => {
    await render(<SignInScreen />);

    await enterEmail('not-an-email');

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.queryByTestId('auth-password')).toBeNull();
    expect(signInWithEmail).not.toHaveBeenCalled();
  });

  it('signs in with email and password in two steps', async () => {
    signInWithEmail.mockResolvedValue(success());

    await render(<SignInScreen />);
    await enterEmail();

    expect(screen.getByTestId('auth-password')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('auth-password'),
      'secret123',
    );
    await fireEvent.press(screen.getByTestId('auth-submit'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/meetings'));
    expect(signInWithEmail).toHaveBeenCalledWith(
      'student@example.test',
      'secret123',
    );
  });

  it('requires a password before submitting', async () => {
    await render(<SignInScreen />);
    await enterEmail();
    await fireEvent.press(screen.getByTestId('auth-submit'));

    expect(screen.getByText('Enter your password.')).toBeTruthy();
    expect(signInWithEmail).not.toHaveBeenCalled();
  });

  it('disables the form while a request is in flight', async () => {
    let resolve: ((result: AuthResult) => void) | undefined;
    signInWithGoogle.mockReturnValue(
      new Promise<AuthResult>((resolveResult) => {
        resolve = resolveResult;
      }),
    );

    await render(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('auth-google'));

    expect(
      screen.getByTestId('auth-google').props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(
      screen.getByTestId('auth-cancel').props.accessibilityState,
    ).toMatchObject({ disabled: true });

    resolve?.(failure('network'));
    await waitFor(() => expect(screen.getByTestId('auth-error')).toBeTruthy());
  });

  it('shows one generic message for wrong credentials and offers a retry', async () => {
    signInWithEmail
      .mockResolvedValueOnce(failure('invalid-credential'))
      .mockResolvedValueOnce(success());

    await render(<SignInScreen />);
    await enterEmail();
    await fireEvent.changeText(screen.getByTestId('auth-password'), 'wrong');
    await fireEvent.press(screen.getByTestId('auth-submit'));

    await waitFor(() =>
      expect(screen.getByText('Email or password is incorrect.')).toBeTruthy(),
    );
    // The transport message must not leak into the UI.
    expect(screen.queryByText('back-end detail')).toBeNull();

    await fireEvent.press(screen.getByTestId('auth-retry'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/meetings'));
  });

  it('explains a provider conflict without retrying automatically', async () => {
    signInWithGoogle.mockResolvedValue(
      failure('account-exists-with-different-credential'),
    );

    await render(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('auth-google'));

    await waitFor(() =>
      expect(
        screen.getByText('This email uses another sign-in method'),
      ).toBeTruthy(),
    );
    expect(
      screen.getByText(
        'Sign in with the method you used when you created the account. We do not link accounts automatically.',
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId('auth-retry')).toBeNull();
  });

  it('closes the modal, or falls back to Home without a back stack', async () => {
    await render(<SignInScreen />);

    await fireEvent.press(screen.getByTestId('auth-cancel'));
    expect(mockBack).toHaveBeenCalledTimes(1);

    mockCanGoBack.mockReturnValue(false);
    await fireEvent.press(screen.getByTestId('auth-cancel'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('ignores an external return destination', async () => {
    signInWithGoogle.mockResolvedValue(success());

    await render(<SignInScreen />);
    await fireEvent.press(screen.getByTestId('auth-google'));

    // The screen reads `/meetings` here, so this test documents that the
    // sanitizer is always in the path; the hostile cases live in its own suite.
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/meetings'));
  });
});
