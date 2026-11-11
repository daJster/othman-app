import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { storageService, STORAGE_KEYS } from '@/platform/storage';

/**
 * Which notices the visitor has opened.
 *
 * A module store rather than component state: the bell lives in two places (the
 * hero panel and the web bar) and both have to clear the same dot. Read ids are
 * persisted per device — there is no backend to own this yet — so the dot does
 * not come back on reload, which is what makes it feel like a real inbox.
 *
 * Hydration is async and the first render is honest about it: `hydrated` is
 * false until storage answers, and the dot stays up rather than flashing.
 */

type Snapshot = {
  ids: ReadonlySet<string>;
  hydrated: boolean;
};

let snapshot: Snapshot = { ids: new Set(), hydrated: false };
const listeners = new Set<() => void>();
let hydrating = false;

function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function hydrate() {
  if (hydrating || snapshot.hydrated) return;

  hydrating = true;

  storageService
    .getItem<string[]>(STORAGE_KEYS.homeNotices, [])
    .then((ids) => {
      emit({ ids: new Set(ids), hydrated: true });
    })
    .catch(() => {
      emit({ ids: snapshot.ids, hydrated: true });
    });
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Snapshot {
  return snapshot;
}

/** The export renders without storage; an empty set is the honest first paint. */
function getServerSnapshot(): Snapshot {
  return EMPTY_SNAPSHOT;
}

const EMPTY_SNAPSHOT: Snapshot = { ids: new Set(), hydrated: false };

export function useReadNotices(): {
  read: ReadonlySet<string>;
  markRead: (ids: readonly string[]) => void;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const markRead = useMemo(
    () => (ids: readonly string[]) => {
      const next = new Set(snapshot.ids);

      for (const id of ids) next.add(id);

      emit({ ids: next, hydrated: true });

      void storageService.setItem(STORAGE_KEYS.homeNotices, [...next]);
    },
    [],
  );

  return { read: state.ids, markRead };
}

/** Test seam: forget the hydrated set between suites. */
export function resetReadNotices(): void {
  hydrating = false;
  snapshot = EMPTY_SNAPSHOT;
}

/** Keeps the module honest under React's Strict Mode double-mount. */
export function useHydrateReadNotices(): void {
  useEffect(() => {
    hydrate();
  }, []);
}
