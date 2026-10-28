import type { AuthErrorCode, AuthResult, AuthUser } from '@/core/types';
import type { User } from 'firebase/auth';

type FirebaseLikeError = { code?: unknown; message?: unknown };

/**
 * Firebase Auth error code → our transport-neutral vocabulary.
 *
 * The map is exhaustive on purpose (a table, not a `switch`): the mapping is
 * the only place that knows Firebase exists, so the UI only ever deals with
 * `AuthErrorCode` and can localize it (P2.4).
 *
 * Codes listed together share one user-facing meaning, e.g. every "these
 * credentials are wrong" variant — including `auth/user-not-found`, which is
 * safe here because sign-in already reveals the same information through the
 * error itself and we no longer probe for account existence.
 */
const ERROR_CODE_MAP: Readonly<Record<string, AuthErrorCode>> = {
  'auth/invalid-credential': 'invalid-credential',
  'auth/invalid-login-credentials': 'invalid-credential',
  'auth/wrong-password': 'invalid-credential',
  'auth/user-not-found': 'invalid-credential',
  'auth/invalid-email': 'invalid-credential',

  'auth/email-already-in-use': 'email-already-in-use',
  'auth/weak-password': 'weak-password',
  'auth/user-disabled': 'user-disabled',

  'auth/network-request-failed': 'network',
  'auth/timeout': 'network',

  'auth/cancelled-popup-request': 'cancelled',
  'auth/popup-closed-by-user': 'cancelled',
  'auth/user-cancelled': 'cancelled',

  'auth/operation-not-allowed': 'operation-not-allowed',
  'auth/too-many-requests': 'too-many-requests',
  'auth/account-exists-with-different-credential':
    'account-exists-with-different-credential',
};

export function mapAuthErrorCode(error: unknown): AuthErrorCode {
  const code = (error as FirebaseLikeError | null)?.code;
  if (typeof code !== 'string') return 'unknown';

  return ERROR_CODE_MAP[code] ?? 'unknown';
}

export function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
  };
}

export function toAuthError(error: unknown, fallback: string): AuthResult {
  const message = (error as FirebaseLikeError | null)?.message;

  return {
    status: 'error',
    code: mapAuthErrorCode(error),
    message: typeof message === 'string' && message ? message : fallback,
  };
}
