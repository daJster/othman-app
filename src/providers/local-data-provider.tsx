import type { ReactNode } from 'react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/providers/auth-provider';
import { localData, type LocalDataSnapshot } from '@/services/local-data';

/**
 * Local-first cache lifecycle.
 *
 * Three jobs, all session-shaped:
 *
 *  1. **Start/stop the engine per account.** Hydration happens here, before
 *     `BootProvider` releases the splash, so the first signed-in frame paints
 *     from disk instead of a skeleton.
 *  2. **Clear the previous account's slice.** The request layer already drops
 *     the previous user's query rows; this removes their persisted copy too.
 *  3. **Revalidate at the moments the answer can have changed:** app foreground
 *     and a slow timer while active. A failed pull leaves the local data in
 *     place; the next attempt is cheap because an unchanged payload is a
 *     checksum hit.
 *
 * The interval is deliberately slower than the shortest `staleTime`: TanStack
 * still revalidates mounted screens on its own schedule, and this loop is the
 * belt for data nobody is currently watching.
 */
export const LOCAL_DATA_SYNC_INTERVAL_MS = 5 * 60_000;

/** Snapshot of the cache state, for the boot gate and diagnostics. */
export function useLocalData(): LocalDataSnapshot {
  return useSyncExternalStore(
    localData.subscribe,
    localData.getSnapshot,
    localData.getSnapshot,
  );
}

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const uid = user?.uid ?? null;
  const userRef = useRef(user);
  const previousUid = useRef<string | null>(null);

  // Keep the latest user available to the session effect without making the
  // effect re-run when the identity object is replaced (a token refresh keeps
  // the same uid but hands the provider a new object).
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (status === 'restoring') return;

    const previous = previousUid.current;

    if (previous && previous !== uid) {
      void localData.clearUser(previous);
    }

    previousUid.current = uid;

    const current = userRef.current;

    if (uid && current) {
      void localData.start(current);
    } else {
      void localData.stop();
    }
  }, [status, uid]);

  useEffect(() => {
    if (!uid) return;

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void localData.syncNow('foreground');
    };
    const subscription = AppState.addEventListener('change', onAppState);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        void localData.syncNow('timer');
      }
    }, LOCAL_DATA_SYNC_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [uid]);

  return <>{children}</>;
}
