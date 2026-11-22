import type { BackendFeatureConfig } from '@/platform/backend';
import { MOCK_BACKEND_ENABLED } from '@/platform/backend';
import { backendConfigRepository } from './backend-config.repository';
import { createConfigService } from './config.service';
import type { ConfigRepository } from './config.types';

/**
 * The empty document, spelled here rather than imported from the flags feature.
 *
 * `services/` sits below the UI layer; the lint boundary exists so a service can
 * never depend on a screen's vocabulary. The shape is three fields and it is the
 * server's contract, not the console's.
 */
const EMPTY_CONFIG: BackendFeatureConfig = {
  flags: {},
  updatedAt: null,
  updatedBy: null,
};

/**
 * Remote configuration service.
 *
 * Today only the mock server publishes a flag document. A build without it uses
 * an empty repository — every feature stays on — instead of reaching for a
 * backend that does not exist. Swapping in Remote Config or a Firestore doc is
 * one repository module and one line here; no screen changes.
 */
const noConfigRepository: ConfigRepository = {
  getFeatures: async () => EMPTY_CONFIG,
  saveFeatures: async () => EMPTY_CONFIG,
};

export const configService = createConfigService(
  MOCK_BACKEND_ENABLED ? backendConfigRepository : noConfigRepository,
);

export { createConfigService } from './config.service';
export type { ConfigRepository, ConfigService } from './config.types';
