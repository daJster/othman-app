import { BackendError, type BackendErrorCode } from '@/platform/backend';

/**
 * One translation of transport failures into user-facing copy.
 *
 * Screens should not branch on `error.code` themselves: the code is a wire
 * detail, the sentence is product copy, and doing the mapping twice is how one
 * screen learns about `already-exists` and the next one keeps saying "something
 * went wrong". The i18n keys already exist (`backend.error.*`), so this module
 * is the only piece that was missing.
 */

export type BackendMessageKey =
  | 'backend.error.invalid'
  | 'backend.error.unauthenticated'
  | 'backend.error.permission'
  | 'backend.error.notFound'
  | 'backend.error.exists'
  | 'backend.error.precondition'
  | 'backend.error.unavailable'
  | 'backend.error.network'
  | 'backend.error.timeout'
  | 'backend.error.unknown';

const MESSAGES: Record<BackendErrorCode, BackendMessageKey> = {
  'invalid-argument': 'backend.error.invalid',
  unauthenticated: 'backend.error.unauthenticated',
  'permission-denied': 'backend.error.permission',
  'not-found': 'backend.error.notFound',
  'already-exists': 'backend.error.exists',
  'failed-precondition': 'backend.error.precondition',
  unavailable: 'backend.error.unavailable',
  internal: 'backend.error.unknown',
  network: 'backend.error.network',
  timeout: 'backend.error.timeout',
};

/**
 * @param error Any rejection: a `BackendError`, a plain `Error`, or a value
 *              thrown by something else. Only the first has a code; everything
 *              else is "unknown", because guessing would be worse than a
 *              generic sentence.
 */
export function backendMessageKey(error: unknown): BackendMessageKey {
  if (error instanceof BackendError) {
    return MESSAGES[error.code] ?? 'backend.error.unknown';
  }

  return 'backend.error.unknown';
}

/**
 * The server's "that email is already taken" signal, named after what the
 * *screen* needs to know. Kept next to the message map so a form that offers
 * "sign in instead" does not have to know the wire code.
 */
export function isDuplicateAccount(error: unknown): boolean {
  return error instanceof BackendError && error.code === 'already-exists';
}
