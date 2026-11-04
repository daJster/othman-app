import {
  appendReading,
  type ReadingEntry,
} from '@/core/domain/quran/reading-log';
import {
  STORAGE_KEYS,
  storageService,
  type StorageService,
} from '@/platform/storage';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { SEED_READING_LOG } from './seed';

/**
 * The local reading log store.
 *
 * A vanilla Zustand store, like the reader: hydration is started by a hook, and
 * the reader actions record into it from outside React. Keeping it out of a
 * context means a page turn does not need a provider, and the landing page can
 * subscribe to a narrow slice while the reader writes to another.
 *
 * Nothing here touches the network. The log is a local convenience, not a
 * source of truth, so a failed storage write is ignored exactly like the
 * reader's `lastVisitedPage` write.
 */

export type ReadingLogFields = {
  /** Newest day first; `appendReading` owns the ordering and the caps. */
  entries: ReadingEntry[];
  /** Persistence has been read once (or the seed was installed). */
  ready: boolean;
};

export type ReadingLogActions = {
  /**
   * Read the stored log once.
   *
   * A first run (missing or corrupt storage) installs the demo seed.
   * A record that lands while the read is in flight is replayed on top of the
   * stored log instead of being overwritten.
   */
  hydrate: () => Promise<void>;
  /** Add a position to today's entry and persist the result. */
  record: (entry: ReadingEntry) => void;
  /** Drop in-memory state so tests can start from a clean store. */
  reset: () => void;
};

export type ReadingLogState = ReadingLogFields & ReadingLogActions;

export type ReadingLogStore = StoreApi<ReadingLogState>;

function isReadingEntry(value: unknown): value is ReadingEntry {
  if (typeof value !== 'object' || value === null) return false;

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.day === 'string' &&
    typeof entry.page === 'number' &&
    Number.isInteger(entry.page) &&
    typeof entry.surah === 'number' &&
    Number.isInteger(entry.surah) &&
    (entry.ayahKey === null || typeof entry.ayahKey === 'string') &&
    (entry.editionKey === null || typeof entry.editionKey === 'string') &&
    typeof entry.at === 'number' &&
    Array.isArray(entry.readPages) &&
    entry.readPages.every(
      (page) => typeof page === 'number' && Number.isInteger(page),
    )
  );
}

function isReadingLog(value: unknown): value is ReadingEntry[] {
  return Array.isArray(value) && value.every(isReadingEntry);
}

export function createReadingLogStore(
  storage: StorageService,
): ReadingLogStore {
  return createStore<ReadingLogState>()((set, get) => ({
    entries: [],
    ready: false,

    async hydrate() {
      if (get().ready) return;

      const stored = await storage.getItem<unknown>(
        STORAGE_KEYS.quranReadingLog,
        null,
      );
      const storedEntries = isReadingLog(stored) ? stored : SEED_READING_LOG;

      set((state) => {
        // Entries are newest first, so replay oldest first to keep the order.
        const pending = [...state.entries].reverse();
        const entries = pending.reduce<ReadingEntry[]>(
          (log, entry) => appendReading(log, entry),
          storedEntries,
        );

        return { entries, ready: true };
      });
    },

    record(entry) {
      const entries = appendReading(get().entries, entry);

      set({ entries });
      // Fire-and-forget: a failed log write must never block a page turn.
      void storage.setItem(STORAGE_KEYS.quranReadingLog, entries);
    },

    reset() {
      set({ entries: [], ready: false });
    },
  }));
}

/**
 * The app-wide log, bound to device storage.
 *
 * The singleton lives beside the factory (unlike the reader's separate
 * `reader-store.instance.ts`) because the log has no factory-only consumer:
 * the reader writes through it and every hook reads through it.
 */
export const readingLogStore = createReadingLogStore(storageService);
