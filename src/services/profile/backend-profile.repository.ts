import type { AccountProfile } from '@/core/domain/account/merge-profile';
import { backendClient } from '@/platform/backend';
import type { BackendAccount, BackendAccountPatch } from '@/platform/backend';
import type { ProfileRepository } from './profile.types';

/**
 * Profile repository backed by the mock server.
 *
 * The backend account is a merge of a SQLite identity row and a JSON profile
 * document; the UI only ever needs the flat `AccountProfile` shape, so the
 * adapter flattens it here. `getByUid` maps a 404 to `null`, matching the
 * Firestore contract where a missing document is a normal "new user" state.
 */

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

export const backendProfileRepository: ProfileRepository = {
  async getByUid(uid: string): Promise<AccountProfile | null> {
    try {
      const { account } = await backendClient.getAccount(uid);

      return toProfile(account);
    } catch (error) {
      if (
        error instanceof Error &&
        'status' in error &&
        (error as { status?: number }).status === 404
      ) {
        return null;
      }

      throw error;
    }
  },

  async getByEmail(email: string): Promise<AccountProfile | null> {
    try {
      const { accounts } = await backendClient.listAccounts({
        q: email,
        limit: 1,
      });

      const match = accounts.find(
        (account) => account.email.toLowerCase() === email.toLowerCase(),
      );

      return match ? toProfile({ ...match, profile: null }) : null;
    } catch {
      // Listing accounts is admin-only. A normal user asking "does this email
      // exist?" gets `null` from the client, never a permission error the UI
      // cannot act on.
      return null;
    }
  },

  async update(uid: string, patch: Partial<AccountProfile>): Promise<void> {
    const mapped = toPatch(patch);
    if (Object.keys(mapped).length === 0) return;

    await backendClient.updateAccount(uid, mapped);
  },
};
