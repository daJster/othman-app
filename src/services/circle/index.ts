import { createCircleService } from './circle.service';
import { mockCircleRepository } from './mock-circle.repository';

/**
 * App-wide circle service.
 *
 * Swapping demo data for Firestore is a one-line change here; the projections
 * in `use-circle.ts` and the components stay as they are.
 */
export const circleService = createCircleService(mockCircleRepository);

export { createCircleService } from './circle.service';
export type {
  CircleItem,
  CircleKind,
  CircleRepository,
  CircleService,
  Localized,
  NoticeTopic,
} from './circle.types';
