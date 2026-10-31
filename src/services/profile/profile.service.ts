import {
  mergeAuthWithProfile,
  type AccountProfile,
} from '@/core/domain/account/merge-profile';
import type { AccountData, AuthUser } from '@/core/types';
import type { ProfileRepository } from './profile.types';

export interface ProfileService {
  /**
   * The account the UI renders: the Firebase Auth record merged with the
   * Firestore profile.
   *
   * A missing profile document is **not** an error — it resolves to the auth
   * data with `role: null`. Only a real backend failure rejects, so the caller
   * can still tell "new user" from "could not load".
   */
  getAccount(authUser: AuthUser): Promise<AccountData>;
  /** Partial profile write; never clobbers fields owned elsewhere. */
  update(uid: string, patch: Partial<AccountProfile>): Promise<void>;
  findByEmail(email: string): Promise<AccountProfile | null>;
}

/**
 * Factory rather than a module singleton: tests (and, later, a different
 * backend) inject their own repository, and this file stays free of any
 * Firebase import so importing it never boots the SDK.
 */
export function createProfileService(
  repository: ProfileRepository,
): ProfileService {
  return {
    async getAccount(authUser: AuthUser): Promise<AccountData> {
      const profile = await repository.getByUid(authUser.uid);
      return mergeAuthWithProfile(authUser, profile);
    },

    async update(uid: string, patch: Partial<AccountProfile>): Promise<void> {
      await repository.update(uid, patch);
    },

    async findByEmail(email: string): Promise<AccountProfile | null> {
      return repository.getByEmail(email);
    },
  };
}
