import type { AccountProfile } from '@/core/domain/account/merge-profile';
import type { RequestOptions } from '@/platform/http';

/**
 * Storage-agnostic profile contract.
 *
 * The service layer depends on this interface, not on Firestore or the mock
 * server, which is what lets the auth provider be tested without either.
 *
 * `getByUid` returning `null` is a normal state, not an error: a user who has
 * just registered has an auth record but no profile document yet.
 */
export interface ProfileRepository {
  getByUid(
    uid: string,
    options?: RequestOptions,
  ): Promise<AccountProfile | null>;
  update(uid: string, patch: Partial<AccountProfile>): Promise<void>;
}
