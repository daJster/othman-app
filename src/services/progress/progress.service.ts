import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import type { ProgressRepository, ProgressService } from './progress.types';

/**
 * Progress service.
 *
 * Thin on purpose: unlike meetings there is no cache or aggregation to own
 * here — the summary maths lives in `core/domain/progress` and the query cache
 * lives in TanStack. The service exists so screens import a stable object and
 * the repository stays swappable behind one factory.
 */
export function createProgressService(
  repository: ProgressRepository,
): ProgressService {
  return {
    listSurahProgress(): Promise<SurahProgress[]> {
      return repository.listSurahProgress();
    },
  };
}
