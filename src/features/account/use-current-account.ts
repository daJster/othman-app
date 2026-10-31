import type { AccountData, AuthUser } from '@/core/types';
import { AUTH_GATING_ENABLED } from '@/features/auth/auth-policy';
import { useAuth } from '@/providers/auth-provider';
import type { AsyncPresentResult } from '@/features/query/async-state';
import mockAccountProfile from '@/data/mock/mockAccountProfile.json';

const MOCK_ACCOUNT = mockAccountProfile as AccountData;

const MOCK_AUTH_USER: AuthUser = {
  uid: MOCK_ACCOUNT.uid,
  email: MOCK_ACCOUNT.email,
  displayName: MOCK_ACCOUNT.displayName,
  photoURL: MOCK_ACCOUNT.photoURL,
};

const MOCK_ACCOUNT_RESULT: AsyncPresentResult<AccountData> = {
  state: { status: 'ready', data: MOCK_ACCOUNT },
  isFetching: false,
};

/**
 * The current session, as the account feature sees it.
 *
 * A thin projection of `AuthProvider`: the screens ask for "the signed-in user
 * or null" and for the merged account, and nothing here owns state. The
 * profile is the provider's `useAccount` query, so there is exactly one cached
 * account per uid.
 */
export function useCurrentAuthUser(): AuthUser | null {
  return useAuth().user;
}

/**
 * The merged account plus the session that owns it.
 *
 * The account query is disabled while signed out and therefore stays `pending`
 * forever — the screen must branch on `authUser` first, not on the query state.
 */
export function useCurrentAccount() {
  const { user, account, sessionError } = useAuth();

  // Development mode: the Account screen is built and reviewed before auth is
  // enforced, so a signed-out device renders `src/data/mock/mockAccountProfile`.
  // Flipping `AUTH_GATING_ENABLED` restores the real session-only path.
  if (!AUTH_GATING_ENABLED && !user) {
    return {
      authUser: MOCK_AUTH_USER,
      ...MOCK_ACCOUNT_RESULT,
      sessionError,
    };
  }

  return { authUser: user, ...account, sessionError };
}

/**
 * Ends the session.
 *
 * All cleanup (query cancellation, private-cache removal, reader reset) lives in
 * `AuthProvider.signOut`; the screen only decides *when* to ask.
 */
export function useSignOut(): () => Promise<void> {
  return useAuth().signOut;
}
