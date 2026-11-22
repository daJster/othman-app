import { backendClient } from '@/platform/backend';
import type {
  BackendFeatureChange,
  BackendFeatureConfig,
} from '@/platform/backend';
import type { ConfigRepository } from './config.types';

/**
 * Remote configuration on the mock server.
 *
 * The wire document is already the domain shape (the server stores what the
 * console edits), so this adapter is deliberately thin: it exists to keep
 * `backendClient` out of the flags feature and to give the tests a seam.
 */
export const backendConfigRepository: ConfigRepository = {
  getFeatures(): Promise<BackendFeatureConfig> {
    return backendClient.getFeatureConfig();
  },

  saveFeatures(
    changes: readonly BackendFeatureChange[],
  ): Promise<BackendFeatureConfig> {
    return backendClient.saveFeatureChanges(
      changes.map((change) => ({
        key: change.key,
        state: change.state,
        ...(change.note === undefined ? {} : { note: change.note }),
        ...(change.exemptRoles === undefined
          ? {}
          : { exemptRoles: [...change.exemptRoles] }),
      })),
    );
  },
};
