import type { ConfigRepository, ConfigService } from './config.types';

/**
 * Config reads carry the app's resilience rule: **fail open**.
 *
 * A kill switch that depends on a network call must not be able to take the app
 * down by being unreachable. If the document cannot be read, the service rejects
 * — the provider turns that into "no overrides" — but the caller still gets a
 * coherent answer. The alternative (fail closed) means one bad deploy of the
 * config endpoint hides every screen, which is worse than the bug the switch
 * was meant to contain.
 *
 * Writes are the opposite: a save that did not reach the server must reject, so
 * a superadmin never sees "saved" for a switch that did not move.
 */
export function createConfigService(
  repository: ConfigRepository,
): ConfigService {
  return {
    features() {
      return repository.getFeatures();
    },

    saveFeatures(changes) {
      if (changes.length === 0) {
        return repository.getFeatures();
      }

      return repository.saveFeatures(changes);
    },
  };
}
