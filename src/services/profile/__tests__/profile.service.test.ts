import type { AuthUser } from '@/core/types';
import { createProfileService } from '@/services/profile/profile.service';
import type { ProfileRepository } from '@/services/profile/profile.types';

/**
 * A fake profile repository: the seam the service depends on. This is also
 * what lets the Firebase SDK stay out of the test process entirely.
 */
function createFakeRepository(
  overrides: Partial<ProfileRepository> = {},
): ProfileRepository & { calls: { update: unknown[][] } } {
  const calls = { update: [] as unknown[][] };

  return {
    calls,
    getByUid: async () => null,
    update: async (uid, patch) => {
      calls.update.push([uid, patch]);
    },
    ...overrides,
  };
}

const authUser: AuthUser = {
  uid: 'uid-1',
  email: 'auth@example.com',
  displayName: 'Auth Name',
  photoURL: 'https://example.com/auth.png',
};

describe('createProfileService', () => {
  describe('getAccount', () => {
    it('merges the profile over the auth record', async () => {
      const service = createProfileService(
        createFakeRepository({
          getByUid: async () => ({
            displayName: 'Profile Name',
            role: 'admin',
            phoneNumber: '+212600000000',
          }),
        }),
      );

      await expect(service.getAccount(authUser)).resolves.toEqual({
        uid: 'uid-1',
        email: 'auth@example.com',
        displayName: 'Profile Name',
        photoURL: 'https://example.com/auth.png',
        role: 'admin',
        phoneNumber: '+212600000000',
      });
    });

    it('resolves to the auth record when no profile document exists yet', async () => {
      const service = createProfileService(createFakeRepository());

      await expect(service.getAccount(authUser)).resolves.toEqual({
        uid: 'uid-1',
        email: 'auth@example.com',
        displayName: 'Auth Name',
        photoURL: 'https://example.com/auth.png',
        role: null,
        phoneNumber: null,
      });
    });

    it('propagates a backend failure instead of faking a profile', async () => {
      const service = createProfileService(
        createFakeRepository({
          getByUid: async () => {
            throw new Error('permission-denied');
          },
        }),
      );

      await expect(service.getAccount(authUser)).rejects.toThrow(
        'permission-denied',
      );
    });

    it('forwards the request options, including the cancellation signal', async () => {
      const getByUid = jest.fn(async () => null);
      const service = createProfileService(createFakeRepository({ getByUid }));
      const controller = new AbortController();

      await service.getAccount(authUser, { signal: controller.signal });

      expect(getByUid).toHaveBeenCalledWith('uid-1', {
        signal: controller.signal,
      });
    });
  });

  describe('update', () => {
    it('forwards a partial patch to the repository', async () => {
      const repository = createFakeRepository();
      const service = createProfileService(repository);

      await service.update('uid-1', { displayName: 'New Name' });

      expect(repository.calls.update).toEqual([
        ['uid-1', { displayName: 'New Name' }],
      ]);
    });

    it('surfaces repository failures', async () => {
      const service = createProfileService(
        createFakeRepository({
          update: async () => {
            throw new Error('unavailable');
          },
        }),
      );

      await expect(service.update('uid-1', {})).rejects.toThrow('unavailable');
    });
  });
});
