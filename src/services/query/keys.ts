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
    /** Every meeting inside the calendar's density window. */
    range: (from: DateKey, to: DateKey) =>
      ['othman', 'meetings', 'range', from, to] as const,
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

  circle: {
    /** Every circle read. Pull-to-refresh invalidates this. */
    root: ['othman', 'circle'] as const,
    /** The demo list behind the rail, the pill and the notices sheet. */
    list: ['othman', 'circle', 'list'] as const,
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
    /**
     * One ayah's text, keyed by the *absolute* ayah number (1–6236).
     *
     * Not by the reader's `ayahKey`: that is ayah-in-surah and repeats on a
     * page that crosses a surah boundary, so two different ayat could share a
     * cache entry.
     */
    ayah: (absoluteNumber: number) =>
      ['othman', 'quran', 'ayah', absoluteNumber] as const,
  },

  notes: {
    /** Every local notes read. Sign-out clears this, unlike public Quran data. */
    root: ['othman', 'notes'] as const,
    /**
     * One ayah's notes *for one namespace*.
     *
     * The namespace is part of the key, not a filter applied after the cache:
     * account A's cached list must not be readable under account B's key.
     */
    byAyah: (namespace: string, absoluteNumber: number) =>
      ['othman', 'notes', namespace, absoluteNumber] as const,
  },

  tafsir: {
    /** Every content-source read for an ayah. */
    root: ['othman', 'tafsir'] as const,
    /**
     * The books offered for one content type on one ayah.
     *
     * Type is in the key because switching type must fetch that type's own
     * list — the reference panel reused one list for every type.
     */
    sources: (type: string, absoluteNumber: number) =>
      ['othman', 'tafsir', 'sources', type, absoluteNumber] as const,
    /**
     * One source's body for one ayah.
     *
     * Type and source id are both present: the same book id under another type
     * is a different result, and a type change must not reuse stale text.
     */
    content: (type: string, absoluteNumber: number, sourceId: number) =>
      ['othman', 'tafsir', 'content', type, absoluteNumber, sourceId] as const,
    /** Surah-level information, keyed by surah not ayah. */
    surah: (surah: number) => ['othman', 'tafsir', 'surah', surah] as const,
  },

  /**
   * Mock-backend reads.
   *
   * A separate namespace from the repositories the screens already use: the
   * adapter-backed reads (`meetings`, `account`, `progress`) keep their original
   * keys so existing hooks are untouched, and these keys exist for operations
   * the core has no repository for yet (account administration, bookmarks,
   * notes, catalog inspection).
   */
  backend: {
    root: ['othman', 'backend'] as const,
    health: ['othman', 'backend', 'health'] as const,
    /**
     * Domain roots.
     *
     * A mutation invalidates the *narrowest* prefix that covers what it
     * changed. Invalidating `backend.root` after every write is correct and
     * wasteful: editing one meeting would drop every cached account, bookmark
     * and note in the app. These prefixes keep the blast radius to one domain.
     */
    accountsRoot: ['othman', 'backend', 'accounts'] as const,
    accountRoot: ['othman', 'backend', 'account'] as const,
    meetingsRoot: ['othman', 'backend', 'meetings'] as const,
    meetingRoot: ['othman', 'backend', 'meeting'] as const,
    quranRoot: ['othman', 'backend', 'quran'] as const,
    accounts: (params: {
      role?: string;
      q?: string;
      limit?: number;
      offset?: number;
    }) => ['othman', 'backend', 'accounts', params] as const,
    account: (uid: string) => ['othman', 'backend', 'account', uid] as const,
    meetings: (params: { date?: string; from?: string; to?: string }) =>
      ['othman', 'backend', 'meetings', params] as const,
    meeting: (id: number) => ['othman', 'backend', 'meeting', id] as const,
    quran: {
      catalog: ['othman', 'backend', 'quran', 'catalog'] as const,
      surah: (number: number) =>
        ['othman', 'backend', 'quran', 'surah', number] as const,
      ayah: (absoluteNumber: number) =>
        ['othman', 'backend', 'quran', 'ayah', absoluteNumber] as const,
      progress: ['othman', 'backend', 'quran', 'progress'] as const,
      bookmarks: ['othman', 'backend', 'quran', 'bookmarks'] as const,
      notesRoot: ['othman', 'backend', 'quran', 'notes'] as const,
      notes: (absoluteNumber?: number) =>
        [
          'othman',
          'backend',
          'quran',
          'notes',
          absoluteNumber ?? 'all',
        ] as const,
    },
  },
} as const;
