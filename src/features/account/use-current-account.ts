import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/core/types';
import { queryKeys } from '@/services/query';
import {
  DEMO_AUTH_USER,
  getDemoSessionSnapshot,
  signOutDemoSession,
  subscribeDemoSession,
} from './demo-session';
import { useAccount } from './use-account';

/**
 * The current session, as the account screens see it.
 *
 * This is the **P3.3 seam**. When `AuthProvider` lands, `useCurrentAuthUser`
 * reads its context and `useSignOut` calls `authService.signOut`; nothing else
 * in the account feature has to change, because the screens only ask for "the
 * signed-in user or null".
 *
 * `useSyncExternalStore` rather than context: the demo session is a module
 * store, and the third argument keeps static web rendering from reading a value
 * the server cannot know.
 */
export function useCurrentAuthUser(): AuthUser | null {
  const signedIn = useSyncExternalStore(
    subscribeDemoSession,
    getDemoSessionSnapshot,
    getDemoSessionSnapshot,
  );

  return signedIn ? DEMO_AUTH_USER : null;
}

/**
 * The merged account plus the session that owns it.
 *
 * The account query is disabled while signed out and therefore stays `pending`
 * forever — the screen must branch on `authUser` first, not on the query state.
 */
export function useCurrentAccount() {
  const authUser = useCurrentAuthUser();
  const account = useAccount(authUser);

  return { authUser, ...account };
}

/**
 * Ends the demo session and drops the cached account.
 *
 * Only the account namespace is cleared: meetings are not private yet (P3.3
 * gates them), so clearing them would be a side effect with no purpose. The
 * real sign-out in P3.3 clears the whole cache.
 */
export function useSignOut(): () => void {
  const client = useQueryClient();

  return useCallback(() => {
    signOutDemoSession();
    client.removeQueries({ queryKey: queryKeys.account.root });
  }, [client]);
}
