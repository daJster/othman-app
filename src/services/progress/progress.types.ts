import type { SurahProgress } from '@/core/domain/progress/surah-progress';

/**
 * Where progress comes from.
 *
 * v1 has no backend for this: the demo repository generates a fixed record so
 * the heatmap is worth looking at. The Firestore/auth implementation (P3.3)
 * drops in behind this interface without touching the screen, the query, or the
 * summary maths.
 */
export interface ProgressRepository {
  /** Every surah the backend knows about, in mushaf order. */
  listSurahProgress(): Promise<SurahProgress[]>;
}

export interface ProgressService {
  listSurahProgress(): Promise<SurahProgress[]>;
}
