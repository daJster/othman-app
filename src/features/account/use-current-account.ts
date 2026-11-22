import type { AuthUser } from '@/core/types';
import { useAuth } from '@/providers/auth-provider';

/**
 * The current session, as the account feature sees it.
 *
 * A thin projection of `AuthProvider`: the screens ask for "the signed-in user
 * or null" and for the merged account, and nothing here owns state. The
 * profile is the provider's `useAccount` query, so there is exactly one cached
 * account per uid.
 *
 * It used to substitute `src/data/mock/mockAccountProfile.json` while auth
 * gating was off. That made a signed-out device look signed in as
 * `othman@kuttab.test`: the Account screen showed a profile, Sign out had no
 * session to clear, and every request (including the meeting list) went out
 * anonymously. Development now gets the same honest state as production —
 * signed out means signed out — and the demo accounts are reachable from the
 * sign-in screen instead of being disguised as a session.
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
