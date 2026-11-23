import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestoreProfileRepository } from '@/services/profile/firestore-profile.repository';

/**
 * The Firestore profile repository is the only code that knows the `users`
 * collection. These tests pin its two promises: a missing document is a normal
 * "new user" state (null), and a write merges so one screen never clobbers the
 * fields another screen owns. The SDK is mocked, so no Firebase app starts.
 */

jest.mock('@/platform/firebase/firebase', () => ({ firestore: {} }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, collection: string, id: string) => ({
    collection,
    id,
  })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

const docMock = doc as unknown as jest.Mock;
const getDocMock = getDoc as unknown as jest.Mock;
const setDocMock = setDoc as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('firestoreProfileRepository', () => {
  it('reads the profile document by uid', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ displayName: 'Student', locale: 'ar' }),
    });

    await expect(firestoreProfileRepository.getByUid('uid-1')).resolves.toEqual(
      {
        displayName: 'Student',
        locale: 'ar',
      },
    );
    expect(docMock).toHaveBeenCalledWith({}, 'users', 'uid-1');
  });

  it('reads a missing document as null, which is a new user rather than an error', async () => {
    getDocMock.mockResolvedValue({ exists: () => false });

    await expect(
      firestoreProfileRepository.getByUid('uid-new'),
    ).resolves.toBeNull();
  });

  it('merges a partial update so fields owned elsewhere survive', async () => {
    setDocMock.mockResolvedValue(undefined);

    await firestoreProfileRepository.update('uid-1', { bio: 'hello' });

    expect(setDocMock).toHaveBeenCalledWith(
      { collection: 'users', id: 'uid-1' },
      { bio: 'hello' },
      { merge: true },
    );
  });

  it('surfaces a failed read instead of reporting a new user', async () => {
    getDocMock.mockRejectedValue(new Error('permission-denied'));

    await expect(firestoreProfileRepository.getByUid('uid-1')).rejects.toThrow(
      'permission-denied',
    );
  });
});
