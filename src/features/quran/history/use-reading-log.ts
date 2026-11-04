import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import {
  hizbProgress,
  previousEntries,
  resumeEntry,
  type HizbProgress,
  type ReadingEntry,
} from '@/core/domain/quran/reading-log';
import {
  readingLogStore,
  type ReadingLogFields,
  type ReadingLogStore,
} from './reading-log.store';

/**
 * Selector hooks for the reading log.
 *
 * Like the reader hooks, every function accepts a store so a test can render a
 * probe against a throwaway log. Components use the app-wide singleton.
 *
 * Arrays and objects are derived outside the selector: a selector that returned
 * a fresh array on every call would tell React the snapshot changed on every
 * read and re-render forever. Selecting the stable `entries` reference and
 * memoising the derivation avoids that.
 */

export function useReadingLog(
  store: ReadingLogStore = readingLogStore,
): ReadingLogFields {
  const entries = useStore(store, (state) => state.entries);
  const ready = useStore(store, (state) => state.ready);

  return useMemo(() => ({ entries, ready }), [entries, ready]);
}

/** The newest position, or `null` for a brand-new reader. */
export function useResumeEntry(
  store: ReadingLogStore = readingLogStore,
): ReadingEntry | null {
  return useStore(store, (state) => resumeEntry(state.entries));
}

/** The readings before the resume, newest first. */
export function usePreviousEntries(
  max = 3,
  store: ReadingLogStore = readingLogStore,
): ReadingEntry[] {
  const entries = useStore(store, (state) => state.entries);

  return useMemo(() => previousEntries(entries, max), [entries, max]);
}

/** Today's hizb gauge for a given day. */
export function useDailyHizb(
  day: string,
  target = 10,
  store: ReadingLogStore = readingLogStore,
): HizbProgress {
  const entries = useStore(store, (state) => state.entries);

  return useMemo(
    () => hizbProgress(entries, day, target),
    [entries, day, target],
  );
}

/**
 * Read the persisted log once, when its consumer mounts.
 *
 * The store guards against a concurrent second call, so a Strict Mode double
 * mount cannot install the seed twice or race a real read.
 */
export function useHydrateReadingLog(
  store: ReadingLogStore = readingLogStore,
): void {
  useEffect(() => {
    void store.getState().hydrate();
  }, [store]);
}
