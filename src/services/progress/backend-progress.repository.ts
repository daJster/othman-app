import { backendClient, type BackendClient } from '@/platform/backend';
import { parseProgressResponse } from './backend-progress.wire';
import type { ProgressRepository } from './progress.types';

/** Progress repository backed by the mock server: one row per surah. */

export type ProgressBackend = Pick<BackendClient, 'listProgress'>;

export function createBackendProgressRepository(
  client: ProgressBackend = backendClient,
): ProgressRepository {
  return {
    async listSurahProgress(options) {
      return parseProgressResponse(await client.listProgress(options));
    },
  };
}

export const backendProgressRepository = createBackendProgressRepository();
