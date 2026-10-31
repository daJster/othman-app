import type { AccountProfile } from '@/core/domain/account/merge-profile';
import { firestore } from '@/platform/firebase/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { ProfileRepository } from './profile.types';

/**
 * Firestore implementation of `ProfileRepository`.
 *
 * The only module in the app that knows the `users` collection exists. Emails
 * are stored and queried lowercase — the legacy web app wrote them that way, so
 * the lookup normalizes instead of relying on the document being canonical.
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

  async getByEmail(email: string): Promise<AccountProfile | null> {
    const users = collection(firestore, 'users');
    const snap = await getDocs(
      query(users, where('email', '==', email.toLowerCase())),
    );
    if (snap.empty) return null;

    return snap.docs[0]?.data() as AccountProfile;
  }

  async update(uid: string, patch: Partial<AccountProfile>): Promise<void> {
    await setDoc(doc(firestore, 'users', uid), patch, { merge: true });
  }
}

export const firestoreProfileRepository: ProfileRepository =
  new FirestoreProfileRepository();
