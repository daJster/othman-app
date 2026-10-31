import { mergeAuthWithProfile } from '@/core/domain/account/merge-profile';
import type { AuthUser } from '@/core/types';

const authUser: AuthUser = {
  uid: 'uid-1',
  email: 'auth@example.com',
  displayName: 'Auth Name',
  photoURL: 'https://example.com/auth.png',
};

describe('mergeAuthWithProfile', () => {
  it('prefers profile values over the auth record', () => {
    expect(
      mergeAuthWithProfile(authUser, {
        displayName: 'Profile Name',
        photoURL: 'https://example.com/profile.png',
        email: 'profile@example.com',
        phoneNumber: '+212600000000',
        role: 'admin',
      }),
    ).toEqual({
      uid: 'uid-1',
      email: 'auth@example.com',
      displayName: 'Profile Name',
      photoURL: 'https://example.com/profile.png',
      role: 'admin',
      phoneNumber: '+212600000000',
    });
  });

  it('falls back to the auth record when the profile is missing', () => {
    expect(mergeAuthWithProfile(authUser, null)).toEqual({
      uid: 'uid-1',
      email: 'auth@example.com',
      displayName: 'Auth Name',
      photoURL: 'https://example.com/auth.png',
      role: null,
      phoneNumber: null,
    });
  });

  it('falls back field by field, not wholesale', () => {
    expect(
      mergeAuthWithProfile(authUser, { displayName: null, role: 'admin' }),
    ).toMatchObject({
      displayName: 'Auth Name',
      photoURL: 'https://example.com/auth.png',
      role: 'admin',
      phoneNumber: null,
    });
  });
});
