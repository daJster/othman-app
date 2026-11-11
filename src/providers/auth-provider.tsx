import { useQueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@/core/types';
import { useAccount } from '@/features/account/use-account';
import { readerStore } from '@/features/quran/store/reader-store.instance';
import { authService } from '@/platform/auth';
import type { AuthService } from '@/platform/auth/auth.types';
import { queryKeys } from '@/services/query';
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from './auth-context';

/**
 * The app's single auth session.
 *
 * Responsibility split, deliberately narrow:
 *
 *  - **session** — this provider subscribes to `authService.onAuthStateChanged`
 *    and owns the current `AuthUser`. Firebase persistence is what makes a
 *    relaunch restore the session; nothing is stored by this file.
 *  - **profile** — resolved through the existing `useAccount` query, so there is
 *    one cache entry per uid and one read path for every screen. The provider
 *    does not copy the profile into a second store.
 *  - **cleanup** — sign-out cancels and drops private query data and resets the
 *    reader's transient state. Public Quran data and display preferences
 *    (theme, language, edition, last page) are preserved.
 *
 * Race protection has two layers. TanStack keys the account by uid, so account
 * A's response can never land in account B's entry. `generation` additionally
 * makes a late hydration read from `getCurrentUser` a no-op once the real
 * observer has reported — that is the "stale hydration" case a slow cold start
 * produces.
 *
 * `service` is injectable so tests describe the contract with a fake instead of
 * booting Firebase. The context object and its type live in `./auth-context`,
 * so the request layer can depend on the session's *shape* without importing
 * this provider (and therefore without a cycle through `useAccount`).
 */

/** Namespaces that belong to a session. `quran` is public and stays cached. */
const PRIVATE_QUERY_KEYS = [
  queryKeys.account.root,
  queryKeys.progress.root,
  queryKeys.meetings.root,
  queryKeys.notes.root,
] as const;

export type AuthProviderProps = {
  children: ReactNode;
  /** Test seam; production resolves the platform implementation. */
  service?: AuthService;
};

export function AuthProvider({
  children,
  service = authService,
}: AuthProviderProps) {
  const client = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [sessionError, setSessionError] = useState<Error | null>(null);

  // The current session generation. Any observer callback increments it, which
  // invalidates the one-shot hydration read below.
  const generation = useRef(0);
  // The uid whose private data is currently cached. `null` means "no previous
  // session", so signing out of a restored session still clears.
  const previousUid = useRef<string | null>(null);

  const clearPrivateData = useCallback(() => {
    for (const key of PRIVATE_QUERY_KEYS) {
      void client.cancelQueries({ queryKey: key });
      client.removeQueries({ queryKey: key });
    }
    readerStore.getState().reset();
  }, [client]);

  const applyUser = useCallback(
    (next: AuthUser | null) => {
      const nextUid = next?.uid ?? null;

      if (nextUid !== previousUid.current) {
        // A different account (or sign-out) must not leave the previous
        // account's private rows addressable for a frame. Clearing synchronously
        // here is what makes that impossible rather than merely unlikely.
        if (previousUid.current !== null) clearPrivateData();
        previousUid.current = nextUid;
      }

      setUser(next);
      setRestoring(false);
      setSessionError(null);
    },
    [clearPrivateData],
  );

  useEffect(() => {
    let active = true;
    const hydrationGeneration = generation.current;

    // `getCurrentUser` is a fallback for a cold start where the observer is
    // slow. It must not overwrite a real observer event, hence the generation
    // check; a rejection is not fatal because the observer may still report.
    void service
      .getCurrentUser()
      .then((restored) => {
        if (!active || generation.current !== hydrationGeneration) return;
        applyUser(restored);
      })
      .catch((error: unknown) => {
        if (!active || generation.current !== hydrationGeneration) return;
        setSessionError(
          error instanceof Error
            ? error
            : new Error('Could not restore session'),
        );
        setRestoring(false);
      });

    const unsubscribe = service.onAuthStateChanged(
      (next) => {
        if (!active) return;
        generation.current += 1;
        applyUser(next);
      },
      (error) => {
        if (!active) return;
        generation.current += 1;
        setSessionError(error);
        setRestoring(false);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [applyUser, service]);

  const account = useAccount(user);

  const signInWithEmail = useCallback(
    async (email: string, password: string) =>
      service.signInWithEmail(email, password),
    [service],
  );

  const registerWithEmail = useCallback(
    async (email: string, password: string) =>
      service.registerWithEmail(email, password),
    [service],
  );

  const signInWithGoogle = useCallback(
    async () => service.signInWithGoogle(),
    [service],
  );

  const signOut = useCallback(async () => {
    // Increment before awaiting: a hydration read that resolves while the
    // sign-out request is in flight must not resurrect the old session.
    generation.current += 1;
    await service.signOut();
    clearPrivateData();
    setUser(null);
    setSessionError(null);
  }, [clearPrivateData, service]);

  const retryProfile = useCallback(() => {
    if (account.state.status === 'error') account.state.retry();
  }, [account.state]);

  const status: AuthStatus = restoring
    ? 'restoring'
    : sessionError && !user
      ? 'error'
      : user
        ? 'signed-in'
        : 'signed-out';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      sessionError,
      account,
      signInWithEmail,
      registerWithEmail,
      signInWithGoogle,
      signOut,
      retryProfile,
    }),
    [
      account,
      registerWithEmail,
      retryProfile,
      sessionError,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      status,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Re-exported from the leaf context module so existing imports
 * (`@/providers/auth-provider`) keep working while the request layer can import
 * `@/providers/auth-context` directly.
 */
export { useAuth, useOptionalAuth } from './auth-context';
export type { AuthContextValue, AuthStatus } from './auth-context';
