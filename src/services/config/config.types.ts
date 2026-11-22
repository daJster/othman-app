import type {
  BackendFeatureChange,
  BackendFeatureConfig,
} from '@/platform/backend';

/**
 * Where remote configuration comes from.
 *
 * The service is the seam, exactly like `profileService`: providers ask for
 * "the features" and a repository decides whether that is the mock server,
 * Firestore, or nothing at all. The types are the wire types on purpose — this
 * layer sits *below* the flags feature (which owns resolution and copy) and
 * must not import it.
 */
export interface ConfigRepository {
  /** The whole flag document. Never partial. */
  getFeatures(): Promise<BackendFeatureConfig>;
  /** Apply staged changes; resolves with the document after the write. */
  saveFeatures(
    changes: readonly BackendFeatureChange[],
  ): Promise<BackendFeatureConfig>;
}

export interface ConfigService {
  features(): Promise<BackendFeatureConfig>;
  saveFeatures(
    changes: readonly BackendFeatureChange[],
  ): Promise<BackendFeatureConfig>;
}
