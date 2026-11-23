import type { QueryKey } from '@tanstack/react-query';

/**
 * The local-first cache: types.
 *
 * A **stored entry** is the durable copy of one TanStack cache key. The checksum
 * is what lets a sync tell "same data" from "new data" without a byte compare;
 * `updatedAt` becomes TanStack's `dataUpdatedAt` after hydration, so the query's
 * own `staleTime` decides whether a screen paints straight from disk or
 * revalidates in the background.
 *
 * Entries are namespaced by user id. The mushaf's public data is intentionally
 * absent: it is immutable and already covered by the image/query caches, and it
 * must not cost a persisted write per page.
 */

export type StoredEntry = {
  key: QueryKey;
  data: unknown;
  /** `checksum(data)` at write time — the cache-hit test. */
  checksum: string;
  /** When the payload was fetched; TanStack's `dataUpdatedAt` after hydrate. */
  updatedAt: number;
  /** When a sync last confirmed this entry against its source. */
  verifiedAt: number;
};

export type StoredUser = {
  savedAt: number;
  entries: StoredEntry[];
};

export type StoredDocument = {
  /** Schema version. A mismatch discards the document, not just one entry. */
  version: 1;
  users: Record<string, StoredUser>;
};

export type SyncScopeName = 'account' | 'progress' | 'meetings';

/**
 * One kind of server data the local cache is allowed to keep.
 *
 * A scope is the *policy* half of the module: which keys belong to it, where a
 * fresh value comes from, and when a stored key has outlived its use. The
 * engine does not know domain shapes; adding previews, notices or another
 * domain later is one scope, not another sync implementation.
 */
export type SyncScope = {
  readonly name: SyncScopeName;
  /** Which cache keys this scope persists and revalidates. */
  matches(key: QueryKey): boolean;
  /** Runs once before a sync pulls this scope (e.g. drop a service-level cache). */
  begin?(): void;
  /** Fresh value for a key, or `null` when the row no longer exists. */
  pull(key: QueryKey): Promise<unknown | null>;
  /** A stored key that must not survive; `true` prunes it from disk and cache. */
  obsolete?(key: QueryKey, now: number): boolean;
};

export type SyncReport = {
  /** Entries where the checksum matched — cache hit, nothing written. */
  verified: number;
  /** Entries whose payload changed and were written to cache and storage. */
  changed: number;
  /** Entries dropped as obsolete or no longer owned by this user. */
  pruned: number;
  /** Entries whose pull failed; they are kept for the next attempt. */
  failed: number;
};

export type HydrateReport = {
  hydrated: number;
  skipped: number;
};

export type LocalDataSnapshot = {
  /** The first hydration has finished; the boot gate waits for this. */
  ready: boolean;
  status: 'idle' | 'hydrating' | 'syncing' | 'error';
  lastSyncedAt: number | null;
  lastError: string | null;
  /** The most recent sync, or null before the first one finishes. */
  report: SyncReport | null;
};

export const EMPTY_REPORT: SyncReport = {
  verified: 0,
  changed: 0,
  pruned: 0,
  failed: 0,
};
