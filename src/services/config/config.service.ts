import type { ConfigRepository, ConfigService } from './config.types';

/**
 * Config reads carry the app's resilience rule: **fail open**.
 *
 * A kill switch that depends on a network call must not be able to take the app
 * down by being unreachable. If the document cannot be read, the service rejects
 * and the provider turns that into "no overrides". The alternative (fail closed)
 * means one bad deploy of the config endpoint hides every screen.
 *
 * Writes are the opposite: a save that did not reach the server must reject, so
 * a superadmin never sees "saved" for a switch that did not move.
 */
export function createConfigService(
  repository: ConfigRepository,
): ConfigService {
  return {
    features(options) {
      return repository.getFeatures(options);
    },

    saveFeatures(changes) {
      if (changes.length === 0) {
        return repository.getFeatures();
      }

      return repository.saveFeatures(changes);
    },
  };
}
