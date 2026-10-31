import { firestoreProfileRepository } from './firestore-profile.repository';
import { createProfileService } from './profile.service';

/**
 * App-wide profile service.
 *
 * Screens and providers import this barrel. They never import a concrete
 * repository directly, which is what keeps `firebase/*` out of the presentation
 * layer (enforced in `eslint.config.js`).
 *
 * The repository is Firestore now that sign-in exists. The in-memory
 * `demo-profile.repository.ts` is retained only as an injectable fixture for
 * tests of the `ProfileRepository` contract; nothing in the app imports it.
 *
 * Reading a missing document is not an error (`mergeAuthWithProfile` supplies
 * the auth-only fallback), and a failed read propagates so the UI can show a
 * retry instead of inventing a role.
 */
export const profileService = createProfileService(firestoreProfileRepository);

export { createProfileService } from './profile.service';
export type { ProfileService } from './profile.service';
export type { ProfileRepository } from './profile.types';
