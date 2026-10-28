import { DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_UID } from '@/services/profile';
import type { AuthUser } from '@/core/types';

/**
 * Demo session — **temporary scaffolding for P4.3**.
 *
 * P3.3 (authentication) is deliberately skipped, so nothing in the app can
 * produce an `AuthUser` yet. Rather than leaving the account tab inert, this
 * module holds a single signed-in user in memory and lets the session be ended
 * so the sign-out row has something to do.
 *
 * It is a small external store (`useSyncExternalStore`) instead of React state
 * because the session is app-wide: the account tab, the edit sheet and (later)
 * the tab bar all read the same value, and a context would only exist to be
 * replaced in P3.3. The replacement is a one-file change: `useCurrentAuthUser`
 * reads `AuthProvider` instead of this store.
 *
 * Signed in by default so the account screen is explorable on first launch.
 * Sign-out is not persisted: relaunching the app restores the demo session.
 */

export const DEMO_AUTH_USER: AuthUser = {
  uid: DEMO_ACCOUNT_UID,
  email: DEMO_ACCOUNT_EMAIL,
  displayName: 'Othman Al-Farsi',
  photoURL: null,
};

let signedIn = true;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeDemoSession(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getDemoSessionSnapshot(): boolean {
  return signedIn;
}

export function signInDemoSession(): void {
  if (signedIn) return;

  signedIn = true;
  emit();
}

export function signOutDemoSession(): void {
  if (!signedIn) return;

  signedIn = false;
  emit();
}

/** Put the fixture back; used by tests that share this module. */
export function resetDemoSession(): void {
  signInDemoSession();
}
