import type {
  AuthErrorCode,
  AuthResult,
  AuthUser,
  Unsubscribe,
} from '@/core/types';
import { BackendError, backendClient } from '@/platform/backend';
import type { BackendClient, BackendUser } from '@/platform/backend';
import type { AuthService } from './auth.types';

/**
 * Auth against the mock backend.
 *
 * This is the same `AuthService` contract the Firebase implementation fulfils,
 * so `AuthProvider`, `RequireAuth` and the screens do not know which provider is
 * running. It exists to make the whole signed-in journey — register, sign in,
 * restore on relaunch, sign out — testable without Firebase credentials.
 *
 * Session restoration reads the persisted token and asks `/v1/auth/session`.
 * A rejected token is cleared instead of looping: a dead session must resolve to
 * "signed out", not to an error the sign-in screen cannot recover from.
 */

function toAuthUser(user: BackendUser): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

const ERROR_CODE_MAP: Partial<Record<string, AuthErrorCode>> = {
  'already-exists': 'email-already-in-use',
  unauthenticated: 'invalid-credential',
  'permission-denied': 'user-disabled',
  'invalid-argument': 'invalid-credential',
  'failed-precondition': 'operation-not-allowed',
  network: 'network',
  timeout: 'network',
  unavailable: 'network',
  internal: 'unknown',
};

function toAuthError(error: unknown, fallback: string): AuthResult {
  if (error instanceof BackendError) {
    return {
      status: 'error',
      code: ERROR_CODE_MAP[error.code] ?? 'unknown',
      message: error.message || fallback,
    };
  }

  return {
    status: 'error',
    code: 'unknown',
    message: error instanceof Error ? error.message : fallback,
  };
}

export function createMockAuthService(
  client: BackendClient = backendClient,
): AuthService {
  const listeners = new Set<(user: AuthUser | null) => void>();
  let current: AuthUser | null = null;
  let inflight: Promise<AuthUser | null> | null = null;

  function emit(): void {
    for (const listener of listeners) {
      listener(current);
    }
  }

  function apply(user: AuthUser | null): AuthUser | null {
    current = user;
    inflight = null;
    emit();

    return current;
  }

  async function restore(): Promise<AuthUser | null> {
    await client.hydrateToken();

    if (!client.getToken()) {
      current = null;
      return null;
    }

    if (current) return current;

    inflight ??= client
      .session()
      .then(({ user }) => toAuthUser(user))
      .catch(async () => {
        // Expired/revoked token: drop it and present a signed-out app.
        await client.setToken(null);
        return null;
      })
      .finally(() => {
        inflight = null;
      });

    current = await inflight;

    return current;
  }

  async function signIn(
    promise: Promise<{ user: BackendUser; token: string }>,
  ) {
    try {
      const session = await promise;
      await client.setToken(session.token);
      const user = toAuthUser(session.user);
      apply(user);

      return { status: 'success', user } satisfies AuthResult;
    } catch (error) {
      return toAuthError(error, 'Failed to sign in');
    }
  }

  return {
    async getCurrentUser(): Promise<AuthUser | null> {
      return restore();
    },

    onAuthStateChanged(
      listener: (user: AuthUser | null) => void,
      onError?: (error: Error) => void,
    ): Unsubscribe {
      listeners.add(listener);

      void restore()
        .then(() => listener(current))
        .catch((error: unknown) =>
          onError?.(error instanceof Error ? error : new Error(String(error))),
        );

      return () => {
        listeners.delete(listener);
      };
    },

    signInWithEmail(email, password): Promise<AuthResult> {
      return signIn(client.login({ email, password }));
    },

    signInWithGoogle(): Promise<AuthResult> {
      return signIn(client.loginWithGoogle());
    },

    async registerWithEmail(email, password): Promise<AuthResult> {
      return signIn(client.register({ email, password }));
    },

    async signOut(): Promise<void> {
      try {
        await client.logout();
      } catch {
        // Signing out locally must succeed even if the server is down; the
        // token is revoked/expired server-side either way.
      }

      await client.setToken(null);
      apply(null);
    },

    async updateProfile(patch): Promise<void> {
      const { user } = await client.updateAuthProfile(patch);
      apply(toAuthUser(user));
    },
  };
}

export const mockAuthService = createMockAuthService();
