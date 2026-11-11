import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import { backendClient } from '@/platform/backend';
import type { ProgressRepository } from './progress.types';

/** Progress repository backed by the mock server; one row per surah. */
export const backendProgressRepository: ProgressRepository = {
  async listSurahProgress(): Promise<SurahProgress[]> {
    const { progress } = await backendClient.listProgress();

    return progress;
  },
};
