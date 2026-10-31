import { Redirect, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';

/**
 * Registry-driven private-route gate.
 *
 * The route registry declares `access: 'private'` for meetings, account and
 * their subroutes. This component is the enforcement point those declarations
 * were written for: a signed-out visitor is redirected to sign-in with the
 * current path preserved, and the sign-in screen validates that path before
 * using it.
 *
 * Nothing renders while the session is being restored: redirecting during
 * `restoring` would bounce a signed-in user through the sign-in screen on every
 * cold start.
 *
 * This is UX, not authorization. Firestore rules remain the security boundary;
 * see the auth setup notes.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const pathname = usePathname();

  if (status === 'restoring') return null;

  if (!user) {
    return (
      <Redirect
        href={{
          pathname: '/auth/sign-in',
          params: { returnTo: pathname },
        }}
      />
    );
  }

  return children;
}
