/**
 * Persisted keys.
 *
 * Keep this list to what the app actually reads back at boot or across
 * sessions. TanStack Query's cache is intentionally *not* here (P3.4): the
 * server cache is in-memory, and only deliberate user state survives a
 * relaunch.
 */
export const STORAGE_KEYS = {
  language: 'language',
  theme: 'theme',
  quranEdition: 'quranreader:edition',
  lastVisitedPage: 'lastVisitedPage',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface StorageService {
  getItem<T>(key: StorageKey, fallback: T): Promise<T>;
  setItem<T>(key: StorageKey, value: T): Promise<boolean>;
  removeItem(key: StorageKey): Promise<boolean>;
  clear(): Promise<boolean>;
}
