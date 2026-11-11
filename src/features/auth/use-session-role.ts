import type { UserRole } from '@/core/types';
import { MOCK_BACKEND_ENABLED } from '@/api';
import { useAuth } from '@/providers/auth-context';

/**
 * The *real* session role.
 *
 * `useCurrentAccount` deliberately falls back to a demo profile while auth
 * gating is off, which is the right call for a screen that only displays an
 * identity. It is the wrong call for anything that writes: a CRUD form must
 * never offer a save button backed by an invented session. This hook reads the
 * provider only, so "no session" stays "no session".
 *
 * `role` is `null` until the merged profile resolves. Screens treat that as
 * "loading", not as "not an admin": the difference is one frame versus a
 * flashed permission error.
 */
export type SessionRoleState = 'restoring' | 'signed-out' | 'loading' | 'ready';

export type SessionRole = {
  state: SessionRoleState;
  uid: string | null;
  role: UserRole | null;
  signedIn: boolean;
  /** A real server session that can carry write operations. */
  canWrite: boolean;
  isAdmin: boolean;
  isSuperadmin: boolean;
};

export function useSessionRole(): SessionRole {
  const { user, status, account } = useAuth();
  const signedIn = user !== null;
  const profile = account.state.status === 'ready' ? account.state.data : null;
  const profileReady = signedIn && profile !== null;
  const role = profile ? (profile.role ?? 'user') : null;

  let state: SessionRoleState;
  if (status === 'restoring') state = 'restoring';
  else if (!signedIn) state = 'signed-out';
  else if (!profileReady) state = 'loading';
  else state = 'ready';

  const isAdmin = role === 'admin' || role === 'superadmin';

  return {
    state,
    uid: user?.uid ?? null,
    role,
    signedIn,
    canWrite: MOCK_BACKEND_ENABLED && signedIn,
    isAdmin: MOCK_BACKEND_ENABLED && isAdmin,
    isSuperadmin: MOCK_BACKEND_ENABLED && role === 'superadmin',
  };
}
