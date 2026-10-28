import type { AccountProfile } from '@/core/domain/account/merge-profile';

/**
 * Storage-agnostic profile contract.
 *
 * The service layer depends on this interface, not on Firestore, which is what
 * lets the auth provider be tested without an emulator and lets the backend be
 * swapped without touching a screen.
 *
 * `getByUid` returning `null` is a normal state, not an error: a user who has
 * just registered has an auth record but no profile document yet.
 */
export interface ProfileRepository {
  getByUid(uid: string): Promise<AccountProfile | null>;
  getByEmail(email: string): Promise<AccountProfile | null>;
  update(uid: string, patch: Partial<AccountProfile>): Promise<void>;
}
