import type { AccountData, AuthUser } from '../../types';
import type { UserRole } from '../../types/user';

export interface AccountProfile {
  role?: UserRole | null;
  displayName?: string | null;
  photoURL?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  [key: string]: unknown;
}

export function mergeAuthWithProfile(
  authUser: AuthUser,
  profile: AccountProfile | null,
): AccountData {
  const safeProfile = profile ?? {};

  return {
    uid: authUser.uid,
    email: authUser.email,
    displayName: safeProfile.displayName ?? authUser.displayName ?? null,
    photoURL: safeProfile.photoURL ?? authUser.photoURL ?? null,
    role: (safeProfile.role as UserRole | null | undefined) ?? null,
    phoneNumber: (safeProfile.phoneNumber as string | null | undefined) ?? null,
  };
}
