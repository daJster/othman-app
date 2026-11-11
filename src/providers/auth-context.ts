import { createContext, useContext } from 'react';
import type { AccountData, AuthResult, AuthUser } from '@/core/types';
import type { AsyncPresentResult } from '@/features/query/async-state';

/**
 * The auth session's *shape*, split from the provider that fills it.
 *
 * Two modules, one reason: the request layer (`@/api`) reacts to the session —
 * the event bridge starts and stops with it — while the provider itself reads
 * server state through the request layer. Keeping the context in a leaf module
 * means the two can import each other's *parameters* without an import cycle
 * between `auth-provider` and `api`.
 *
 * Nothing here renders or fetches; it is a type and a context object.
 */

export type AuthStatus = 'restoring' | 'signed-in' | 'signed-out' | 'error';

export type AuthContextValue = {
  readonly user: AuthUser | null;
  readonly status: AuthStatus;
  readonly sessionError: Error | null;
  readonly account: AsyncPresentResult<AccountData>;
  readonly signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<AuthResult>;
  readonly registerWithEmail: (
    email: string,
    password: string,
  ) => Promise<AuthResult>;
  readonly signInWithGoogle: () => Promise<AuthResult>;
  readonly signOut: () => Promise<void>;
  /** Retry a failed profile read; no-op unless the query is in `error`. */
  readonly retryProfile: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }

  return value;
}

/**
 * The same session, or `null` outside a provider.
 *
 * For code that runs in both worlds — a hook rendered on its own in a test, a
 * subscription that mounts before the provider — where throwing would turn a
 * "no session" case into a crash.
 */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
