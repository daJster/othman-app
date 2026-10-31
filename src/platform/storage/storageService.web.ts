import { createStorageService } from './storage.backend';
import type { StorageBackend } from './storage.backend';

/**
 * `localStorage` throws on access in private mode / when storage is disabled,
 * so availability is probed once and cached — probing on every read meant a
 * test write on every theme or language lookup.
 *
 * `getStorage()` is a function, not a module-level constant: during static
 * rendering (Expo Router `web.output: 'static'`) this module is evaluated in
 * Node, where `window` does not exist.
 */
let cached: Storage | null | undefined;

function getStorage(): Storage | null {
  if (cached !== undefined) return cached;

  try {
    const probe = '__storage_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    cached = window.localStorage;
  } catch {
    cached = null;
  }

  return cached;
}

function requireStorage(): Storage {
  const storage = getStorage();
  if (!storage) {
    throw new Error('localStorage is unavailable');
  }

  return storage;
}

const backend: StorageBackend = {
  getItem: (key) => requireStorage().getItem(key),
  setItem: (key, value) => requireStorage().setItem(key, value),
  removeItem: (key) => requireStorage().removeItem(key),
  clear: () => requireStorage().clear(),
};

export const storageService = createStorageService(backend, 'web');
