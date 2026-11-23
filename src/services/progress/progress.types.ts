import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import type { RequestOptions } from '@/platform/http';

/**
 * Where progress comes from.
 *
 * The demo repository generates a fixed record so the heatmap is worth looking
 * at offline; the backend repository reads the signed-in student's rows. The
 * screen, the query and the summary maths do not change between them.
 */
export interface ProgressRepository {
  /** Every surah the backend knows about, in mushaf order. */
  listSurahProgress(options?: RequestOptions): Promise<SurahProgress[]>;
}

export interface ProgressService {
  listSurahProgress(options?: RequestOptions): Promise<SurahProgress[]>;
}
