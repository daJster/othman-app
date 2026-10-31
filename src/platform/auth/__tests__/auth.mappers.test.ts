import {
  mapAuthErrorCode,
  toAuthError,
  toAuthUser,
} from '@/platform/auth/auth.mappers';
import type { User } from 'firebase/auth';

describe('mapAuthErrorCode', () => {
  it.each([
    ['auth/invalid-credential', 'invalid-credential'],
    ['auth/invalid-login-credentials', 'invalid-credential'],
    ['auth/wrong-password', 'invalid-credential'],
    ['auth/user-not-found', 'invalid-credential'],
    ['auth/email-already-in-use', 'email-already-in-use'],
    ['auth/weak-password', 'weak-password'],
    ['auth/user-disabled', 'user-disabled'],
    ['auth/network-request-failed', 'network'],
    ['auth/cancelled-popup-request', 'cancelled'],
    ['auth/popup-closed-by-user', 'cancelled'],
    ['auth/operation-not-allowed', 'operation-not-allowed'],
    ['auth/too-many-requests', 'too-many-requests'],
    [
      'auth/account-exists-with-different-credential',
      'account-exists-with-different-credential',
    ],
  ])('maps %s to %s', (code, expected) => {
    expect(mapAuthErrorCode({ code })).toBe(expected);
  });

  it('falls back to unknown for unmapped, missing or malformed codes', () => {
    expect(mapAuthErrorCode({ code: 'auth/some-new-code' })).toBe('unknown');
    expect(mapAuthErrorCode({})).toBe('unknown');
    expect(mapAuthErrorCode({ code: 42 })).toBe('unknown');
    expect(mapAuthErrorCode(null)).toBe('unknown');
    expect(mapAuthErrorCode('not an error')).toBe('unknown');
  });
});

describe('toAuthError', () => {
  it('keeps the mapped code and the Firebase message', () => {
    expect(
      toAuthError(
        { code: 'auth/too-many-requests', message: 'Too many attempts' },
        'fallback',
      ),
    ).toEqual({
      status: 'error',
      code: 'too-many-requests',
      message: 'Too many attempts',
    });
  });

  it('uses the fallback when the error has no usable message', () => {
    expect(
      toAuthError({ code: 'auth/network-request-failed' }, 'fallback'),
    ).toMatchObject({ message: 'fallback' });
    expect(toAuthError({ message: '' }, 'fallback')).toMatchObject({
      message: 'fallback',
    });
    expect(toAuthError(undefined, 'fallback')).toMatchObject({
      status: 'error',
      code: 'unknown',
      message: 'fallback',
    });
  });
});

describe('toAuthUser', () => {
  it('normalizes optional Firebase fields to null', () => {
    expect(
      toAuthUser({
        uid: 'uid-1',
        email: 'user@example.com',
        displayName: null,
        photoURL: undefined,
      } as unknown as User),
    ).toEqual({
      uid: 'uid-1',
      email: 'user@example.com',
      displayName: null,
      photoURL: null,
    });
  });
});
