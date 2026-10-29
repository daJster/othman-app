import type { DateKey } from '@/core/types';

/**
 * Query keys.
 *
 * A factory, not inline arrays: invalidation is prefix-based in TanStack Query,
 * so the prefix has to be *shared* rather than retyped. `queryKeys.meetings.root`
 * invalidates every cached day without knowing which days are cached — a
 * hand-written `['meetings']` in one file and `['meeting', date]` in another is
 * how a stale list survives a refresh.
 *
 * Shape: `['othman', <domain>, ...]`.
 *
 *  - `othman` namespaces the app. It costs one array element and makes the keys
 *    greppable in devtools and in tests.
 *  - The second segment is the invalidation boundary (`meetings`, `account`).
 *  - Parameters after that identify one server row.
 *
 * All arrays are `as const` so they stay readonly — TanStack treats query keys
 * as immutable, and a mutable array in a component would make the key identity
 * change on every render.
 */
export const queryKeys = {
  /** Everything the app has cached. Sign-out clears this (P3.3). */
  all: ['othman'] as const,

  meetings: {
    /** Every day. Pull-to-refresh invalidates this. */
    root: ['othman', 'meetings'] as const,
    /** One day's list. */
    byDate: (date: DateKey) => ['othman', 'meetings', date] as const,
  },

  account: {
    /** Every account. Sign-out clears this. */
    root: ['othman', 'account'] as const,
    /** One user's merged auth + profile record. */
    byUid: (uid: string) => ['othman', 'account', uid] as const,
  },

  progress: {
    /** Every progress read. Sign-out clears this. */
    root: ['othman', 'progress'] as const,
    /** The 114 surah rows behind the heatmap. */
    surah: ['othman', 'progress', 'surah'] as const,
  },

  quran: {
    /**
     * Every Qur'an read.
     *
     * Not cleared on sign-out: the mushaf is public content, and dropping a
     * multi-megabyte bbox table because an unrelated session ended would make
     * the next page turn hit the network.
     */
    root: ['othman', 'quran'] as const,
    /** Editions + 114 surah metadata. Fetched once per launch. */
    catalog: ['othman', 'quran', 'catalog'] as const,
    /** Both bbox tables of one edition, keyed by the catalog's `key`. */
    bboxes: (editionKey: string) =>
      ['othman', 'quran', 'bboxes', editionKey] as const,
  },
} as const;
