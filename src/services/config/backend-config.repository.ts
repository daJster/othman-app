import {
  backendClient,
  type BackendClient,
  type BackendFeatureChange,
} from '@/platform/backend';
import { parseFeatureConfig } from './backend-config.wire';
import type { ConfigRepository } from './config.types';

/**
 * Remote configuration on the mock server.
 *
 * The adapter names the two requests and validates the document. It exists so
 * the flags feature never imports the backend client, and so tests can inject
 * a fake client.
 */

export type ConfigBackend = Pick<
  BackendClient,
  'getFeatureConfig' | 'saveFeatureChanges'
>;

export function createBackendConfigRepository(
  client: ConfigBackend = backendClient,
): ConfigRepository {
  return {
    async getFeatures(options) {
      return parseFeatureConfig(await client.getFeatureConfig(options));
    },

    async saveFeatures(changes: readonly BackendFeatureChange[]) {
      return parseFeatureConfig(
        await client.saveFeatureChanges(
          changes.map((change) => ({
            key: change.key,
            state: change.state,
            ...(change.note === undefined ? {} : { note: change.note }),
            ...(change.exemptRoles === undefined
              ? {}
              : { exemptRoles: [...change.exemptRoles] }),
          })),
        ),
      );
    },
  };
}

export const backendConfigRepository = createBackendConfigRepository();
