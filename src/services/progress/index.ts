import { demoProgressRepository } from './demo-progress.repository';
import { createProgressService } from './progress.service';

/**
 * App-wide progress service.
 *
 * TODO(P3.3): replace `demoProgressRepository` with the account-backed
 * repository. Nothing else changes: the screen asks for rows, not for a
 * backend.
 */
export const progressService = createProgressService(demoProgressRepository);

export { createProgressService } from './progress.service';
export type { ProgressRepository, ProgressService } from './progress.types';
