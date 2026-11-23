import type { AccountProfile } from '@/core/domain/account/merge-profile';
import { firestore } from '@/platform/firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { ProfileRepository } from './profile.types';

/**
 * Firestore implementation of `ProfileRepository`.
 *
 * The only module in the app that knows the `users` collection exists. Lookups
 * are by uid only: the app used to query by email too, but no screen ever
 * called it, so that query (and its privacy cost) is gone.
 *
 * Writes use `merge: true`: a partial profile update must never overwrite the
 * fields a different screen owns.
 */
class FirestoreProfileRepository implements ProfileRepository {
  async getByUid(uid: string): Promise<AccountProfile | null> {
    const snap = await getDoc(doc(firestore, 'users', uid));
    if (!snap.exists()) return null;

    return snap.data() as AccountProfile;
  }

  async update(uid: string, patch: Partial<AccountProfile>): Promise<void> {
    await setDoc(doc(firestore, 'users', uid), patch, { merge: true });
  }
}

export const firestoreProfileRepository: ProfileRepository =
  new FirestoreProfileRepository();
