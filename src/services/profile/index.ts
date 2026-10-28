import {
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_UID,
  demoProfileRepository,
} from './demo-profile.repository';
import { createProfileService } from './profile.service';

/**
 * App-wide profile service.
 *
 * Screens and providers import this barrel. They never import a concrete
 * repository directly, which is what keeps `firebase/*` out of the presentation
 * layer (enforced in `eslint.config.js`).
 *
 * TODO(P3.3): swap `demoProfileRepository` for `firestoreProfileRepository`
 * once sign-in exists. The demo repository and the demo session in
 * `features/account/demo-session.ts` are the only pieces that know the account
 * is fake; the screens and hooks already speak `ProfileService`.
 */
export const profileService = createProfileService(demoProfileRepository);

export {
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_UID,
} from './demo-profile.repository';
export { createProfileService } from './profile.service';
export type { ProfileService } from './profile.service';
export type { ProfileRepository } from './profile.types';
