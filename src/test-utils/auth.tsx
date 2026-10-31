import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { AuthResult, AuthUser } from '@/core/types';
import { AuthProvider } from '@/providers/auth-provider';
import type { AuthService } from '@/platform/auth/auth.types';

/**
 * Test-only auth doubles.
 *
 * `AuthProvider` takes its service as a prop precisely so tests can drive a
 * session without Firebase. `createFakeAuthService` is a real `AuthService`
 * implementation: listeners, unsubscribe, and the credential methods all
 * behave, which is what lets integration-style screen tests exercise the
 * provider instead of mocking `useAuth` away.
 */

export type FakeAuthService = AuthService & {
  /** Emit a session change to every current listener. */
  setUser: (user: AuthUser | null) => void;
  /** Convenience for sign-in results: set the session and emit. */
  succeed: (user: AuthUser) => AuthResult;
  readonly listeners: Set<(user: AuthUser | null) => void>;
  readonly unsubscribed: jest.Mock;
  readonly signOutCalls: jest.Mock;
};

export function createFakeAuthService(
  initialUser: AuthUser | null = null,
): FakeAuthService {
  let current = initialUser;
  const listeners = new Set<(user: AuthUser | null) => void>();
  const unsubscribed = jest.fn();
  const signOutCalls = jest.fn(async () => {
    current = null;
    for (const listener of listeners) listener(null);
  });

  const emit = (user: AuthUser | null) => {
    current = user;
    for (const listener of listeners) listener(user);
  };

  return {
    listeners,
    unsubscribed,
    signOutCalls,
    setUser: emit,
    succeed: (user: AuthUser) => {
      emit(user);
      return { status: 'success', user };
    },
    async getCurrentUser() {
      return current;
    },
    onAuthStateChanged(listener) {
      listeners.add(listener);
      listener(current);
      return () => {
        listeners.delete(listener);
        unsubscribed();
      };
    },
    async signInWithEmail() {
      return {
        status: 'error',
        code: 'invalid-credential',
        message: 'fake',
      };
    },
    async registerWithEmail() {
      return {
        status: 'error',
        code: 'invalid-credential',
        message: 'fake',
      };
    },
    async signInWithGoogle() {
      return {
        status: 'error',
        code: 'cancelled',
        message: 'fake',
      };
    },
    signOut: signOutCalls,
    async updateProfile() {
      return undefined;
    },
  };
}

export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

export function TestProviders({
  client,
  service,
  children,
}: {
  client: QueryClient;
  service: AuthService;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider service={service}>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
