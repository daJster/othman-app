import { firestoreProfileRepository } from './firestore-profile.repository';
import { createProfileService } from './profile.service';

/**
 * App-wide profile service.
 *
 * Screens and providers import this barrel. They never import
 * `firestore-profile.repository` directly, which is what keeps `firebase/*`
 * out of the presentation layer (enforced in `eslint.config.js`).
 */
export const profileService = createProfileService(firestoreProfileRepository);

export { createProfileService } from './profile.service';
export type { ProfileService } from './profile.service';
export type { ProfileRepository } from './profile.types';
