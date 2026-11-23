import type { StorageKey, StorageService } from '@/platform/storage';

/**
 * In-memory `StorageService` for tests.
 *
 * Mirrors the real adapter's contract (JSON values, fallback on missing keys,
 * boolean results). The raw map is exposed so a test can assert what actually
 * reached the "disk" instead of only what a read-back would say.
 */
export function memoryStorage(): StorageService & {
  values: Map<string, string>;
} {
  const values = new Map<string, string>();

  return {
    values,
    async getItem<T>(key: StorageKey, fallback: T): Promise<T> {
      const raw = values.get(key);

      if (raw === undefined) return fallback;

      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    async setItem<T>(key: StorageKey, value: T): Promise<boolean> {
      values.set(key, JSON.stringify(value));

      return true;
    },
    async removeItem(key: StorageKey): Promise<boolean> {
      values.delete(key);

      return true;
    },
    async clear(): Promise<boolean> {
      values.clear();

      return true;
    },
  };
}
