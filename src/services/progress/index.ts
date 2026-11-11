import { MOCK_BACKEND_ENABLED } from '@/platform/backend';
import { createProgressService } from './progress.service';
import { backendProgressRepository } from './backend-progress.repository';
import { demoProgressRepository } from './demo-progress.repository';

/**
 * App-wide progress service.
 *
 * `EXPO_PUBLIC_MOCK_BACKEND=1` reads the signed-in student's rows from the mock
 * server; otherwise the deterministic demo record keeps the heatmap explorable
 * offline. Nothing else changes: the screen asks for rows, not for a backend.
 */
export const progressService = createProgressService(
  MOCK_BACKEND_ENABLED ? backendProgressRepository : demoProgressRepository,
);

export { createProgressService } from './progress.service';
export type { ProgressRepository, ProgressService } from './progress.types';
