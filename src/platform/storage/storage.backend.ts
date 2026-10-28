import { type StorageKey, type StorageService } from './storage.types';

/**
 * The four methods a storage backend has to provide. Deliberately structural:
 * AsyncStorage and `localStorage` both satisfy it (the web adapter wraps the
 * synchronous API), so the JSON/error handling lives in exactly one place.
 */
export interface StorageBackend {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}

/**
 * Build a `StorageService` over a backend.
 *
 * Guarantees that matter to every caller:
 *  - `getItem` never throws and never returns `undefined`; a missing key, a
 *    corrupt payload (bad JSON, half-written value) and a backend failure all
 *    resolve to the caller's `fallback`.
 *  - `setItem`/`removeItem`/`clear` report success as a boolean instead of
 *    throwing, because every call site is a fire-and-forget preference write.
 *  - Values are JSON, so booleans, numbers, objects and arrays round-trip.
 */
export function createStorageService(
  backend: StorageBackend,
  label: string,
): StorageService {
  return {
    async getItem<T>(key: StorageKey, fallback: T): Promise<T> {
      try {
        const item = await backend.getItem(key);
        if (item === null || item === undefined) return fallback;

        return JSON.parse(item) as T;
      } catch (error) {
        console.warn(
          `[storage:${label}] getItem failed for key "${key}":`,
          error,
        );
        return fallback;
      }
    },

    async setItem<T>(key: StorageKey, value: T): Promise<boolean> {
      try {
        const serialized = JSON.stringify(value);
        if (serialized === undefined) return false;

        await backend.setItem(key, serialized);
        return true;
      } catch (error) {
        console.warn(
          `[storage:${label}] setItem failed for key "${key}":`,
          error,
        );
        return false;
      }
    },

    async removeItem(key: StorageKey): Promise<boolean> {
      try {
        await backend.removeItem(key);
        return true;
      } catch (error) {
        console.warn(
          `[storage:${label}] removeItem failed for key "${key}":`,
          error,
        );
        return false;
      }
    },

    async clear(): Promise<boolean> {
      try {
        await backend.clear();
        return true;
      } catch (error) {
        console.warn(`[storage:${label}] clear failed:`, error);
        return false;
      }
    },
  };
}
