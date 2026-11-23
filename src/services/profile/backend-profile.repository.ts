import type { AccountProfile } from '@/core/domain/account/merge-profile';
import {
  BackendError,
  backendClient,
  type BackendAccount,
  type BackendAccountPatch,
  type BackendClient,
} from '@/platform/backend';
import { parseAccountResponse } from './backend-profile.wire';
import type { ProfileRepository } from './profile.types';

/**
 * Profile repository backed by the mock server.
 *
 * The backend account merges an identity row with a profile document; the UI
 * only needs the flat `AccountProfile`, so the adapter flattens it here. A 404
 * maps to `null`, matching the Firestore contract where a missing document is a
 * normal "new user" state. Every other failure propagates.
 */

export type ProfileBackend = Pick<
  BackendClient,
  'getAccount' | 'updateAccount'
>;

function toProfile(account: BackendAccount): AccountProfile {
  return {
    email: account.email,
    displayName: account.displayName,
    photoURL: account.photoURL,
    role: account.role,
    phoneNumber: account.phoneNumber,
    ...(account.profile
      ? {
          bio: account.profile.bio,
          locale: account.profile.locale,
          notifications: account.profile.notifications,
        }
      : {}),
  };
}

function toPatch(patch: Partial<AccountProfile>): BackendAccountPatch {
  const mapped: BackendAccountPatch = {};

  if (patch.displayName !== undefined) {
    mapped.displayName = patch.displayName as string | null;
  }
  if (patch.photoURL !== undefined) {
    mapped.photoURL = patch.photoURL as string | null;
  }
  if (patch.phoneNumber !== undefined) {
    mapped.phoneNumber = patch.phoneNumber as string | null;
  }
  if (patch.role !== undefined) {
    mapped.role = patch.role as BackendAccountPatch['role'];
  }

  const profile: NonNullable<BackendAccountPatch['profile']> = {};

  if (typeof patch.bio === 'string' || patch.bio === null) {
    profile.bio = patch.bio;
  }
  if (patch.locale === 'ar' || patch.locale === 'en') {
    profile.locale = patch.locale;
  }
  if (typeof patch.notifications === 'boolean') {
    profile.notifications = patch.notifications;
  }

  if (Object.keys(profile).length > 0) mapped.profile = profile;

  return mapped;
}

export function createBackendProfileRepository(
  client: ProfileBackend = backendClient,
): ProfileRepository {
  return {
    async getByUid(uid, options) {
      try {
        const account = parseAccountResponse(
          await client.getAccount(uid, options),
        );

        return toProfile(account);
      } catch (error) {
        if (error instanceof BackendError && error.status === 404) return null;

        throw error;
      }
    },

    async update(uid, patch) {
      const mapped = toPatch(patch);

      if (Object.keys(mapped).length === 0) return;

      await client.updateAccount(uid, mapped);
    },
  };
}

export const backendProfileRepository = createBackendProfileRepository();
