import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { AuthUser } from '@/core/types';
import { checksum } from './checksum';
import {
  EMPTY_REPORT,
  type LocalDataSnapshot,
  type StoredDocument,
  type StoredEntry,
  type StoredUser,
  type SyncReport,
  type SyncScope,
} from './local-data.types';
import { emptyDocument, type LocalStore } from './local-store';

/**
 * The managed local cache.
 *
 * Reads are served from the persisted copy and revalidated in the background;
 * a sync pulls each stored key, compares checksums and only writes what the
 * server actually changed. The interesting states are explicit:
 *
 *  - **hit** — checksum equal: nothing is written, no screen re-renders.
 *  - **miss** — no stored entry: the next successful read is captured and saved.
 *  - **changed** — checksum differs: the query cache and the stored entry are
 *    replaced, with a fresh `updatedAt` so staleTime restarts.
 *  - **obsolete** — outside the scope's retention or no longer owned: dropped
 *    from disk and from the cache (only when no screen is observing it).
 *
 * Writes are captured from the query cache itself, so a screen's own refetch is
 * persisted without the screen knowing this module exists.
 *
 * The interface is intentionally small: `start`/`stop` for the session,
 * `syncNow` for the scheduler, `clearUser` for sign-out, and an external-store
 * snapshot for the boot gate and diagnostics. Everything else is implementation.
 */

export type SyncReason = 'start' | 'foreground' | 'manual' | 'timer';

export type SyncEngineDeps = {
  client: QueryClient;
  store: LocalStore;
  /** Built per user: scopes may need the uid (the account key does). */
  scopes: (user: AuthUser) => SyncScope[];
  now?: () => number;
  /** A burst of query successes becomes one storage write. */
  writeDelayMs?: number;
  logger?: (message: string, error?: unknown) => void;
};

export type LocalDataEngine = {
  /** Hydrate the stored slice, subscribe to successful reads, start a sync. */
  start(user: AuthUser): Promise<void>;
  /** Flush pending writes and stop capturing. */
  stop(): Promise<void>;
  /** Revalidate every stored key. Safe to call concurrently. */
  syncNow(reason?: SyncReason): Promise<SyncReport | null>;
  /** Delete one account's slice (sign-out); unknown uids are a no-op. */
  clearUser(uid: string): Promise<void>;
  /** Await pending storage writes (sign-out, tests, app teardown). */
  flush(): Promise<void>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): LocalDataSnapshot;
};

const DEFAULT_WRITE_DELAY = 250;

export function createSyncEngine({
  client,
  store,
  scopes: buildScopes,
  now = Date.now,
  writeDelayMs = DEFAULT_WRITE_DELAY,
  logger = (message, error) => console.warn(`[local-data] ${message}`, error),
}: SyncEngineDeps): LocalDataEngine {
  let documentState: StoredDocument = emptyDocument();
  let user: AuthUser | null = null;
  let userDocument: StoredUser | null = null;
  let scopes: SyncScope[] = [];
  let unsubscribeCache: (() => void) | null = null;
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  let writes: Promise<void> = Promise.resolve();
  let dirty = false;
  let runningSync: Promise<SyncReport | null> | null = null;
  let generation = 0;

  const listeners = new Set<() => void>();
  let snapshot: LocalDataSnapshot = {
    ready: false,
    status: 'idle',
    lastSyncedAt: null,
    lastError: null,
    report: null,
  };

  function emit(patch: Partial<LocalDataSnapshot>): void {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  }

  function keyId(key: QueryKey): string {
    return JSON.stringify(key);
  }

  function scopeFor(key: QueryKey): SyncScope | null {
    return scopes.find((scope) => scope.matches(key)) ?? null;
  }

  function entryFor(key: QueryKey): StoredEntry | null {
    if (!userDocument) return null;

    const id = keyId(key);

    return (
      userDocument.entries.find((entry) => keyId(entry.key) === id) ?? null
    );
  }

  function scheduleWrite(): void {
    if (!userDocument) return;

    userDocument.savedAt = now();
    dirty = true;

    if (writeTimer !== null) clearTimeout(writeTimer);

    writeTimer = setTimeout(() => {
      writeTimer = null;
      void persist();
    }, writeDelayMs);
  }

  function persist(): Promise<void> {
    if (!dirty) return writes;

    dirty = false;

    const document = documentState;

    writes = writes.then(async () => {
      await store.write(document);
    });

    return writes;
  }

  async function flush(): Promise<void> {
    if (writeTimer !== null) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }

    await persist();
  }

  function removeEntry(entry: StoredEntry): void {
    if (!userDocument) return;

    userDocument.entries = userDocument.entries.filter(
      (candidate) => candidate !== entry,
    );

    // Dropping the data under a mounted screen would blank it. The row is
    // already obsolete, so its cache copy may live out the session; it just
    // must not come back after a relaunch.
    const query = client
      .getQueryCache()
      .find({ queryKey: entry.key, exact: true });

    if (query && query.getObserversCount() === 0) {
      client.removeQueries({ queryKey: entry.key, exact: true });
    }
  }

  /**
   * Put stored entries back into the query cache before the navigator mounts.
   *
   * `updatedAt` travels with them, so `staleTime` decides the next read:
   * fresh data paints from disk and waits; stale data paints from disk and
   * revalidates — the stale-while-revalidate half of the strategy.
   */
  function hydrateEntries(at: number): { hydrated: number; skipped: number } {
    if (!userDocument) return { hydrated: 0, skipped: 0 };

    let hydrated = 0;
    let skipped = 0;
    const kept: StoredEntry[] = [];

    for (const entry of userDocument.entries) {
      const scope = scopeFor(entry.key);
      const intact =
        scope !== null &&
        Array.isArray(entry.key) &&
        typeof entry.checksum === 'string' &&
        entry.checksum === checksum(entry.data);
      const obsolete = scope?.obsolete?.(entry.key, at) ?? false;

      if (!intact || obsolete) {
        skipped += 1;
        continue;
      }

      client.setQueryData(entry.key, entry.data, {
        updatedAt: entry.updatedAt,
      });
      kept.push(entry);
      hydrated += 1;
    }

    userDocument.entries = kept;

    // A discarded entry is a real change on disk; without this the corrupt row
    // would be re-read (and re-skipped) on every launch.
    if (skipped > 0) dirty = true;

    return { hydrated, skipped };
  }

  function capture(): void {
    unsubscribeCache?.();

    unsubscribeCache = client.getQueryCache().subscribe((event) => {
      if (!userDocument) return;
      if (event.type !== 'updated' || event.action.type !== 'success') return;

      const key = event.query.queryKey;

      if (!scopeFor(key)) return;

      const data = event.action.data;
      const nextChecksum = checksum(data);
      const existing = entryFor(key);

      // Our own hydrate/sync writes land here too; equal checksums stop them
      // from scheduling a second write.
      if (existing && existing.checksum === nextChecksum) return;

      const at = event.action.dataUpdatedAt ?? now();

      if (existing) {
        existing.data = data;
        existing.checksum = nextChecksum;
        existing.updatedAt = at;
        existing.verifiedAt = at;
      } else {
        userDocument.entries.push({
          key,
          data,
          checksum: nextChecksum,
          updatedAt: at,
          verifiedAt: at,
        });
      }

      scheduleWrite();
    });
  }

  async function syncNow(
    reason: SyncReason = 'manual',
  ): Promise<SyncReport | null> {
    if (!user || !userDocument) return null;
    if (runningSync) return runningSync;

    runningSync = runSync(reason);

    try {
      return await runningSync;
    } finally {
      runningSync = null;
    }
  }

  async function runSync(reason: SyncReason): Promise<SyncReport> {
    if (!userDocument) return { ...EMPTY_REPORT };

    const report: SyncReport = { ...EMPTY_REPORT };
    const at = now();

    emit({ status: 'syncing', lastError: null });

    for (const scope of scopes) scope.begin?.();

    // Snapshot: pruning mutates the stored list while this loop walks it.
    for (const entry of [...userDocument.entries]) {
      if (!userDocument) break;

      const scope = scopeFor(entry.key);

      if (!scope) {
        removeEntry(entry);
        report.pruned += 1;
        continue;
      }

      if (scope.obsolete?.(entry.key, at)) {
        removeEntry(entry);
        report.pruned += 1;
        continue;
      }

      try {
        const fresh = await scope.pull(entry.key);

        if (fresh === null || fresh === undefined) {
          removeEntry(entry);
          report.pruned += 1;
          continue;
        }

        const nextChecksum = checksum(fresh);
        entry.verifiedAt = at;

        if (nextChecksum === entry.checksum) {
          report.verified += 1;
          continue;
        }

        entry.data = fresh;
        entry.checksum = nextChecksum;
        entry.updatedAt = at;
        client.setQueryData(entry.key, fresh, { updatedAt: at });
        report.changed += 1;
      } catch (error) {
        report.failed += 1;
        logger(`sync of ${scope.name} failed (${reason})`, error);
      }
    }

    if (userDocument) userDocument.savedAt = at;

    // Only a replacement or a prune changes what is on disk. A pure hit leaves
    // the stored bytes untouched.
    if (report.changed > 0 || report.pruned > 0) dirty = true;

    await flush();

    const failedOnly =
      report.failed > 0 &&
      report.changed === 0 &&
      report.verified === 0 &&
      report.pruned === 0;

    emit({
      status: failedOnly ? 'error' : 'idle',
      lastSyncedAt: at,
      lastError: failedOnly
        ? 'The server could not be reached; local data is still being used.'
        : null,
      report,
    });

    return report;
  }

  async function stopInternal(): Promise<void> {
    unsubscribeCache?.();
    unsubscribeCache = null;

    await flush();

    user = null;
    userDocument = null;
    scopes = [];

    if (snapshot.status !== 'idle') emit({ status: 'idle' });
  }

  async function start(nextUser: AuthUser): Promise<void> {
    // Cancel any in-flight start/stop, then tear down the previous session.
    generation += 1;
    const run = generation;

    await stopInternal();

    if (run !== generation) return;

    emit({ status: 'hydrating', lastError: null });
    user = nextUser;
    documentState = await store.read();

    if (run !== generation) return;

    userDocument = documentState.users[nextUser.uid] ?? {
      savedAt: 0,
      entries: [],
    };
    documentState.users[nextUser.uid] = userDocument;
    scopes = buildScopes(nextUser);

    hydrateEntries(now());
    capture();

    emit({ ready: true, status: 'idle' });

    // Revalidate in the background: the boot gate must not wait on the network.
    void syncNow('start');
  }

  async function stop(): Promise<void> {
    generation += 1;
    await stopInternal();

    // No session means there is nothing to hydrate. Releasing the gate here is
    // what lets a signed-out launch boot at all; `start` is the only path that
    // must hold it until the stored slice is in the query cache.
    if (!snapshot.ready) emit({ ready: true });
  }

  async function clearUser(uid: string): Promise<void> {
    // Let a pending debounced write land first, so the read-modify-write below
    // cannot be undone by it.
    await flush();

    const stored = await store.read();

    if (stored.users[uid]) {
      delete stored.users[uid];
      await store.write(stored);
    }

    documentState = stored;

    if (user?.uid === uid) userDocument = null;
  }

  return {
    start,
    stop,
    syncNow,
    clearUser,
    flush,
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
  };
}
