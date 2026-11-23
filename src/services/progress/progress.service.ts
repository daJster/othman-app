import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import type { RequestOptions } from '@/platform/http';
import type { ProgressRepository, ProgressService } from './progress.types';

/**
 * Progress service.
 *
 * Thin on purpose: there is no cache or aggregation to own here. The summary
 * maths lives in `core/domain/progress` and the cache lives in TanStack Query.
 * The service exists so screens import a stable object and the repository stays
 * swappable behind one factory.
 */
export function createProgressService(
  repository: ProgressRepository,
): ProgressService {
  return {
    listSurahProgress(options?: RequestOptions): Promise<SurahProgress[]> {
      return repository.listSurahProgress(options);
    },
  };
}
