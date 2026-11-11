import { MOCK_BACKEND_ENABLED } from '@/platform/backend';
import { backendProfileRepository } from './backend-profile.repository';
import { firestoreProfileRepository } from './firestore-profile.repository';
import { createProfileService } from './profile.service';

/**
 * App-wide profile service.
 *
 * Screens and providers import this barrel. They never import a concrete
 * repository directly, which is what keeps `firebase/*` out of the presentation
 * layer (enforced in `eslint.config.js`).
 *
 * With `EXPO_PUBLIC_MOCK_BACKEND=1` the account lives in the mock backend; the
 * merge contract (`authUser` + profile) is identical, so `useAccount` and the
 * account screens do not change.
 */
export const profileService = createProfileService(
  MOCK_BACKEND_ENABLED ? backendProfileRepository : firestoreProfileRepository,
);

export { createProfileService } from './profile.service';
export type { ProfileService } from './profile.service';
export type { ProfileRepository } from './profile.types';
