import { BackendError } from '@/platform/backend';
import {
  createBackendProfileRepository,
  type ProfileBackend,
} from '@/services/profile/backend-profile.repository';

/**
 * The profile adapter flattens the server's account into the one shape the UI
 * reads, and maps a 404 to "no profile yet". Every other failure must reach the
 * caller: a permission error reported as "new user" would send a signed-in
 * admin to the onboarding screen.
 */

const ACCOUNT = {
  uid: 'uid-1',
  email: 'student@example.com',
  displayName: 'Student',
  photoURL: null,
  role: 'user',
  phoneNumber: '+212600000000',
  disabled: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  profile: {
    bio: null,
    locale: 'ar',
    notifications: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
};

function fakeBackend(
  overrides: Partial<Record<'getAccount' | 'updateAccount', jest.Mock>> = {},
): ProfileBackend {
  return {
    getAccount: jest.fn().mockResolvedValue({ account: ACCOUNT }),
    updateAccount: jest.fn().mockResolvedValue({ account: ACCOUNT }),
    ...overrides,
  } as unknown as ProfileBackend;
}

describe('createBackendProfileRepository', () => {
  it('flattens the account and its profile into the UI shape', async () => {
    const repository = createBackendProfileRepository(fakeBackend());

    await expect(repository.getByUid('uid-1')).resolves.toEqual({
      email: 'student@example.com',
      displayName: 'Student',
      photoURL: null,
      role: 'user',
      phoneNumber: '+212600000000',
      bio: null,
      locale: 'ar',
      notifications: true,
    });
  });

  it('reads a 404 as a user with no profile document yet', async () => {
    const repository = createBackendProfileRepository(
      fakeBackend({
        getAccount: jest
          .fn()
          .mockRejectedValue(new BackendError('not-found', 'missing', 404)),
      }),
    );

    await expect(repository.getByUid('uid-9')).resolves.toBeNull();
  });

  it('propagates every other failure instead of reporting a new user', async () => {
    const repository = createBackendProfileRepository(
      fakeBackend({
        getAccount: jest
          .fn()
          .mockRejectedValue(
            new BackendError('permission-denied', 'nope', 403),
          ),
      }),
    );

    await expect(repository.getByUid('uid-1')).rejects.toBeInstanceOf(
      BackendError,
    );
  });

  it('forwards the cancellation options to the account read', async () => {
    const getAccount = jest.fn().mockResolvedValue({ account: ACCOUNT });
    const repository = createBackendProfileRepository(
      fakeBackend({ getAccount }),
    );
    const controller = new AbortController();

    await repository.getByUid('uid-1', { signal: controller.signal });

    expect(getAccount).toHaveBeenCalledWith('uid-1', {
      signal: controller.signal,
    });
  });

  it('sends only the fields the backend owns, grouped under profile', async () => {
    const updateAccount = jest.fn().mockResolvedValue({ account: ACCOUNT });
    const repository = createBackendProfileRepository(
      fakeBackend({ updateAccount }),
    );

    await repository.update('uid-1', {
      displayName: 'New name',
      bio: 'hello',
      locale: 'en',
      notifications: false,
    });

    expect(updateAccount).toHaveBeenCalledWith('uid-1', {
      displayName: 'New name',
      profile: { bio: 'hello', locale: 'en', notifications: false },
    });
  });

  it('makes no request for a patch with no backend-owned field', async () => {
    const updateAccount = jest.fn();
    const repository = createBackendProfileRepository(
      fakeBackend({ updateAccount }),
    );

    await repository.update('uid-1', { email: 'other@example.com' });

    expect(updateAccount).not.toHaveBeenCalled();
  });
});
