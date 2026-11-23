import { STORAGE_KEYS, type StorageService } from '@/platform/storage';
import type { StoredDocument } from './local-data.types';

/**
 * The durable half of the local cache.
 *
 * One storage key holds every user's slice, because `StorageService` keys are a
 * fixed, typed list and a per-user dynamic key would widen that contract for one
 * module. The document is small (the account row, the progress snapshot and the
 * meeting windows actually visited), and a sign-out deletes one slice instead of
 * the whole store.
 *
 * Versioning is deliberately blunt: a schema mismatch discards *everything*.
 * Migrating unknown shapes is how a cache starts lying; refetching is cheap and
 * correct.
 */

export const LOCAL_DATA_VERSION = 1 as const;

export function emptyDocument(): StoredDocument {
  return { version: LOCAL_DATA_VERSION, users: {} };
}

export type LocalStore = {
  read(): Promise<StoredDocument>;
  write(document: StoredDocument): Promise<boolean>;
};

export function createLocalStore(storage: StorageService): LocalStore {
  return {
    async read() {
      const raw = await storage.getItem<StoredDocument>(
        STORAGE_KEYS.localData,
        emptyDocument(),
      );

      if (
        !raw ||
        typeof raw !== 'object' ||
        raw.version !== LOCAL_DATA_VERSION ||
        !raw.users ||
        typeof raw.users !== 'object'
      ) {
        return emptyDocument();
      }

      return raw;
    },

    write(document) {
      return storage.setItem(STORAGE_KEYS.localData, document);
    },
  };
}
