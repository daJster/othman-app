import {
  mergeAuthWithProfile,
  type AccountProfile,
} from '@/core/domain/account/merge-profile';
import type { AccountData, AuthUser } from '@/core/types';
import type { RequestOptions } from '@/platform/http';
import type { ProfileRepository } from './profile.types';

export interface ProfileService {
  /**
   * The account the UI renders: the auth record merged with the profile.
   *
   * A missing profile document is **not** an error. It resolves to the auth
   * data with `role: null`. Only a real backend failure rejects, so the caller
   * can still tell "new user" from "could not load".
   */
  getAccount(
    authUser: AuthUser,
    options?: RequestOptions,
  ): Promise<AccountData>;
  /** Partial profile write; never clobbers fields owned elsewhere. */
  update(uid: string, patch: Partial<AccountProfile>): Promise<void>;
}

/**
 * Factory rather than a module singleton: tests and a future backend inject
 * their own repository, and this file never imports an SDK.
 */
export function createProfileService(
  repository: ProfileRepository,
): ProfileService {
  return {
    async getAccount(authUser, options) {
      const profile = await repository.getByUid(authUser.uid, options);

      return mergeAuthWithProfile(authUser, profile);
    },

    async update(uid, patch) {
      await repository.update(uid, patch);
    },
  };
}
