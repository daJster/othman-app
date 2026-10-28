import type { AccountProfile } from '@/core/domain/account/merge-profile';
import type { ProfileRepository } from './profile.types';

/**
 * In-memory profile repository — **temporary scaffolding**.
 *
 * P3.3 (authentication) was skipped, so there is no Firebase user to read a
 * profile for. P4.3 builds the account screens against this repository instead
 * of shipping a half-wired screen, which means the account tab can be opened,
 * edited and signed out of today.
 *
 * The swap point is the barrel (`./index.ts`): replace this repository with
 * `firestoreProfileRepository`, delete this file and the demo session in
 * `features/account/demo-session.ts`. Nothing else imports it.
 *
 * The write is intentionally synchronous-ish and lossy exactly like a real
 * backend would be from the UI's point of view: partial patches merge, and a
 * refetch is the only way to observe the result.
 */

export const DEMO_ACCOUNT_UID = 'demo-account';
export const DEMO_ACCOUNT_EMAIL = 'othman@kuttab.test';

export const DEMO_PROFILE: AccountProfile = {
  displayName: 'Othman Al-Farsi',
  email: DEMO_ACCOUNT_EMAIL,
  phoneNumber: '+966501234567',
  photoURL: null,
  role: 'user',
};

export type DemoProfileRepository = ProfileRepository & {
  /** Put the fixture back; used by tests that share this module. */
  reset(): void;
  /** The current fixture, for assertions that do not want a second async hop. */
  snapshot(): AccountProfile;
};

export function createDemoProfileRepository(
  initial: AccountProfile,
): DemoProfileRepository {
  let profile: AccountProfile = { ...initial };

  return {
    async getByUid(uid: string): Promise<AccountProfile | null> {
      return uid === DEMO_ACCOUNT_UID ? { ...profile } : null;
    },

    async getByEmail(email: string): Promise<AccountProfile | null> {
      const stored = profile.email;
      if (typeof stored !== 'string') return null;

      return stored.toLowerCase() === email.toLowerCase()
        ? { ...profile }
        : null;
    },

    async update(_uid: string, patch: Partial<AccountProfile>): Promise<void> {
      profile = { ...profile, ...patch };
    },

    reset(): void {
      profile = { ...initial };
    },

    snapshot(): AccountProfile {
      return { ...profile };
    },
  };
}

export const demoProfileRepository = createDemoProfileRepository(DEMO_PROFILE);
