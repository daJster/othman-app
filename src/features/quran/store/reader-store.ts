import { resolveEditionKey } from '@/core/domain/quran/editions';
import { clampPageToEdition, isPageInEdition } from '@/core/domain/quran/page';
import { isAyahInSurah, isSurahNumber } from '@/core/domain/quran/surah';
import type { EditionBboxes, PageAyahBboxes, QuranEdition } from '@/core/types';
import { STORAGE_KEYS, type StorageService } from '@/platform/storage';
import { createStore, type StoreApi } from 'zustand/vanilla';

/**
 * The reader's own state.
 *
 * Server data (catalog, bbox tables, ayah text) belongs to TanStack Query; this
 * store owns only what a *user* decides: which page they are on, which ayah is
 * selected, which edition they prefer and which way the last page turn went.
 * Keeping that split means a refetch of the bbox tables cannot move the reader,
 * and a page turn cannot invalidate a query.
 *
 * The store is a vanilla Zustand store, not a React context:
 *
 *  - navigation is called from gesture callbacks, keyboard handlers and deep
 *    links, none of which are React renders;
 *  - the page image, the footer and the ayah overlay subscribe to different
 *    slices, so a page turn must not re-render the 114-row surah picker or the
 *    edition list.
 *
 * This module imports no React. The selector hooks live in `use-reader.ts`,
 * which is also what lets these actions be tested without a renderer.
 */

/**
 * `idle`  - nothing is attached yet (boot, or storage still being read).
 * `restoring` - the persisted edition/page is being read. Screens wait for this
 *           before resolving an edition, otherwise they fetch the default
 *           edition and then immediately fetch the stored one.
 * `ready` - an edition and its bbox tables are attached; navigation is allowed.
 *
 * Data errors are deliberately not here: they belong to TanStack Query, which
 * already distinguishes retrying, failed and stale reads.
 */
export type ReaderStatus = 'idle' | 'restoring' | 'ready';

/**
 * The direction of the last page turn, in *reading order*, not on screen.
 *
 * Arabic reads right-to-left, so "forward" slides the next page in from the
 * left. Naming the direction after the reading order keeps the animation code
 * free of `if (isRtl)` and lets the same enum describe an English UI.
 */
export type PageTurnDirection = 'forward' | 'backward' | null;

export type ReaderFields = {
  /** Resolved edition key (`"1"`), or `null` before the catalog is attached. */
  editionKey: string | null;
  /** Current mushaf page, always inside the attached edition's range. */
  page: number;
  /** Surah the page starts with, 1–114. */
  surah: number;
  /** Selected ayah, keyed the way the bbox tables key ayat (`"7"`). */
  ayahKey: string | null;
  /** Consumed by the page-turn animation; `null` means "do not animate". */
  direction: PageTurnDirection;
  status: ReaderStatus;
  /**
   * Storage has been read once.
   *
   * `status` alone cannot answer this: it returns to `idle` after the read, and
   * a screen that rendered before the read would resolve the *default* edition
   * and then immediately fetch the stored one. A dedicated flag lets the reader
   * wait for the preference without inventing a fourth status.
   */
  restored: boolean;
  /** Stored edition preference, before it is resolved against the catalog. */
  preferredEditionKey: string | null;
  /** Stored page, consumed once by `attachEdition`. */
  restoredPage: number | null;
  /** The attached edition, for the page image URL and range checks. */
  edition: QuranEdition | null;
  /** Both bbox tables of the attached edition. */
  bboxes: EditionBboxes | null;
};

export type ReaderActions = {
  /**
   * Read the persisted edition and page.
   *
   * Resolves before the catalog does, so the screen can fetch the *preferred*
   * edition's bbox tables instead of fetching the default and switching.
   * Storage never throws (see `createStorageService`); a corrupt value is
   * ignored rather than repaired.
   */
  restore: () => Promise<void>;
  /**
   * Attach the catalog and the preferred edition's bbox tables.
   *
   * Safe to call again after a refetch: the restored page is consumed on the
   * first call, so a later call keeps the page the user is actually on. An
   * empty catalog is a no-op instead of a crash — the screen shows the query's
   * empty state.
   */
  attachEdition: (
    editions: Record<string, QuranEdition>,
    bboxes: EditionBboxes,
  ) => void;
  /**
   * Switch editions, keeping the reader's place.
   *
   * The web reader reset to `first_page`, which threw away the reader's
   * position on an accidental tap. Page numbers are close enough across the
   * published scans that clamping is the better failure mode. The key is
   * persisted; a key the catalog no longer has falls back to the first edition.
   */
  switchEdition: (
    editions: Record<string, QuranEdition>,
    bboxes: EditionBboxes,
    editionKey: string,
  ) => void;
  /** Jump to a page, clamped to the edition. Fractional input rounds. */
  goToPage: (page: number) => void;
  /** Next page in reading order; a no-op at the edition's last page. */
  goNextPage: () => void;
  /** Previous page in reading order; a no-op at the edition's first page. */
  goPrevPage: () => void;
  /** Jump to a surah, defaulting to its first ayah. */
  goToSurah: (surah: number, ayah?: number) => void;
  /** Jump to one ayah of one surah, selecting it. */
  goToAyah: (surah: number, ayah: number) => void;
  /** Select an ayah already visible on the current page (a bbox tap). */
  selectAyah: (ayahKey: string) => void;
  /** Clear the selection (a tap outside every bbox). */
  clearSelection: () => void;
  /** Let the page-turn animation mark itself finished. */
  clearDirection: () => void;
};

export type ReaderState = ReaderFields & ReaderActions;

export type ReaderStore = StoreApi<ReaderState>;

/**
 * The surah a page *starts* with.
 *
 * Derived from the smallest absolute ayah number, not from the first key in the
 * page's `ayat` map. That map is keyed by ayah-in-surah, so on a page that ends
 * one surah and starts the next the keys restart at `"1"` and JavaScript's
 * ascending key order puts the *new* surah first. The web reader used the first
 * key and sometimes labelled a page with the surah it ends with (P5.2 fixes
 * this).
 *
 * `null` when the payload has no boxes for the page: the page image can still
 * be shown, and the caller keeps the label it had.
 */
export function surahAtPage(
  bboxes: EditionBboxes,
  page: number,
): number | null {
  const rows = bboxes.byPage[String(page)];
  if (!rows) return null;

  let first: PageAyahBboxes | null = null;

  for (const row of Object.values(rows)) {
    if (!first || row.absoluteNumber < first.absoluteNumber) first = row;
  }

  return first?.surahNumber ?? null;
}

function turnDirection(from: number, to: number): PageTurnDirection {
  if (to > from) return 'forward';
  if (to < from) return 'backward';

  return null;
}

export function createReaderStore(storage: StorageService): ReaderStore {
  const rememberPage = (page: number) => {
    // Fire-and-forget: a failed preference write must never block a page turn.
    void storage.setItem(STORAGE_KEYS.lastVisitedPage, page);
  };

  return createStore<ReaderState>()((set, get) => ({
    editionKey: null,
    page: 1,
    surah: 1,
    ayahKey: null,
    direction: null,
    status: 'idle',
    restored: false,
    preferredEditionKey: null,
    restoredPage: null,
    edition: null,
    bboxes: null,

    async restore() {
      // A second mount (Strict Mode, Fast Refresh) must not race the first
      // read, and a reader that is already attached has nothing to restore.
      if (get().status !== 'idle' || get().restored) return;

      set({ status: 'restoring' });

      const [storedEditionKey, storedPage] = await Promise.all([
        storage.getItem<unknown>(STORAGE_KEYS.quranEdition, null),
        storage.getItem<unknown>(STORAGE_KEYS.lastVisitedPage, null),
      ]);

      const preferredEditionKey =
        typeof storedEditionKey === 'string' &&
        storedEditionKey.trim().length > 0
          ? storedEditionKey
          : null;
      const restoredPage =
        typeof storedPage === 'number' &&
        Number.isInteger(storedPage) &&
        storedPage >= 1
          ? storedPage
          : null;

      set((state) => ({
        preferredEditionKey,
        restoredPage,
        restored: true,
        // `attachEdition` may have won the race; never downgrade a ready reader.
        status: state.status === 'ready' ? 'ready' : 'idle',
      }));
    },

    attachEdition(editions, bboxes) {
      const state = get();
      // Once an edition is attached, a later call is a refetch, not a boot:
      // keep the user's current edition instead of re-resolving the stored one.
      const editionKey = resolveEditionKey(
        editions,
        state.editionKey ?? state.preferredEditionKey,
      );
      if (!editionKey) return;

      const edition = editions[editionKey];
      const restored =
        state.restoredPage !== null &&
        isPageInEdition(edition, state.restoredPage)
          ? state.restoredPage
          : null;
      const page = restored ?? clampPageToEdition(edition, state.page);
      const pageRows = bboxes.byPage[String(page)];

      set({
        editionKey,
        edition,
        bboxes,
        page,
        surah: surahAtPage(bboxes, page) ?? state.surah,
        // A refetch should not throw away a selection that is still visible.
        ayahKey:
          state.ayahKey && pageRows?.[state.ayahKey] ? state.ayahKey : null,
        direction: null,
        status: 'ready',
        // One-shot: a later attach (bbox refetch) must not jump back to the
        // page the app was on at launch.
        restoredPage: null,
      });
    },

    switchEdition(editions, bboxes, editionKey) {
      const state = get();
      const resolvedKey = resolveEditionKey(editions, editionKey);
      if (!resolvedKey) return;

      const edition = editions[resolvedKey];
      const page = clampPageToEdition(edition, state.page);

      set({
        editionKey: resolvedKey,
        edition,
        bboxes,
        page,
        surah: surahAtPage(bboxes, page) ?? state.surah,
        ayahKey: null,
        direction: null,
        status: 'ready',
        restoredPage: null,
      });

      if (page !== state.page) rememberPage(page);
      void storage.setItem(STORAGE_KEYS.quranEdition, resolvedKey);
    },

    goToPage(nextPage) {
      const state = get();
      if (!state.edition || !state.bboxes) return;

      // `Math.round` first so a deep link like `?page=12.4` still lands on a
      // real scan; `clampPageToEdition` then handles NaN and the edition range.
      const target = clampPageToEdition(state.edition, Math.round(nextPage));

      if (target === state.page) {
        // Tapping "next" on the last page must not leave a pending animation.
        if (state.direction !== null) set({ direction: null });
        return;
      }

      set({
        page: target,
        surah: surahAtPage(state.bboxes, target) ?? state.surah,
        ayahKey: null,
        direction: turnDirection(state.page, target),
      });
      rememberPage(target);
    },

    goNextPage() {
      get().goToPage(get().page + 1);
    },

    goPrevPage() {
      get().goToPage(get().page - 1);
    },

    goToSurah(surah, ayah = 1) {
      get().goToAyah(surah, ayah);
    },

    goToAyah(surah, ayah) {
      const state = get();
      if (!state.edition || !state.bboxes) return;
      if (!isSurahNumber(surah) || !isAyahInSurah(ayah)) return;

      const row = state.bboxes.bySurah[String(surah)]?.[String(ayah)];
      if (!row) return;

      const target = clampPageToEdition(state.edition, row.pageNumber);

      set({
        page: target,
        surah,
        ayahKey: String(ayah),
        // Selecting another ayah on the same page is not a page turn.
        direction: turnDirection(state.page, target),
      });

      if (target !== state.page) rememberPage(target);
    },

    selectAyah(ayahKey) {
      const state = get();
      const row = state.bboxes?.byPage[String(state.page)]?.[ayahKey];
      // A tap can only land on a box that was drawn, but a stale selection from
      // a previous page can arrive through a caller: ignore it rather than
      // labelling the footer with an ayah that is not there.
      if (!row) return;

      set({ ayahKey, surah: row.surahNumber });
    },

    clearSelection() {
      if (get().ayahKey === null) return;

      set({ ayahKey: null });
    },

    clearDirection() {
      if (get().direction === null) return;

      set({ direction: null });
    },
  }));
}
