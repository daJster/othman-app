import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import {
  type PageTurnDirection,
  type ReaderActions,
  type ReaderState,
  type ReaderStatus,
  type ReaderStore,
} from './reader-store';
import { readerStore } from './reader-store.instance';

/**
 * Selector hooks for the reader store.
 *
 * Every hook takes an optional store so tests can render a probe against a
 * throwaway store instead of the app-wide singleton. Components use the default.
 *
 * Select *narrowly*. A page turn writes `page`, `surah`, `ayahKey` and
 * `direction` in one `set`, so a component that selects the whole state
 * re-renders on every turn even if it only draws the footer. The hooks below
 * exist so that is the uncommon case rather than the default.
 */

export function useReaderPage(store: ReaderStore = readerStore): number {
  return useStore(store, (state) => state.page);
}

export function useReaderSurah(store: ReaderStore = readerStore): number {
  return useStore(store, (state) => state.surah);
}

export function useReaderAyahKey(
  store: ReaderStore = readerStore,
): string | null {
  return useStore(store, (state) => state.ayahKey);
}

export function useReaderDirection(
  store: ReaderStore = readerStore,
): PageTurnDirection {
  return useStore(store, (state) => state.direction);
}

export function useReaderStatus(
  store: ReaderStore = readerStore,
): ReaderStatus {
  return useStore(store, (state) => state.status);
}

export function useReaderEditionKey(
  store: ReaderStore = readerStore,
): string | null {
  return useStore(store, (state) => state.editionKey);
}

export function useReaderEdition(
  store: ReaderStore = readerStore,
): ReaderState['edition'] {
  return useStore(store, (state) => state.edition);
}

export function useReaderBboxes(
  store: ReaderStore = readerStore,
): ReaderState['bboxes'] {
  return useStore(store, (state) => state.bboxes);
}

export function useReaderRestored(store: ReaderStore = readerStore): boolean {
  return useStore(store, (state) => state.restored);
}

export function useReaderPreferredEditionKey(
  store: ReaderStore = readerStore,
): string | null {
  return useStore(store, (state) => state.preferredEditionKey);
}

/**
 * Actions, with stable identities.
 *
 * The actions are created once by the store factory and never replaced, so the
 * memo has nothing to depend on but the store itself. Handlers can therefore
 * call `actions.goNextPage` without an effect re-subscribing on every render.
 */
export function useReaderActions(
  store: ReaderStore = readerStore,
): ReaderActions {
  return useMemo(() => {
    const state = store.getState();

    return {
      restore: state.restore,
      attachEdition: state.attachEdition,
      switchEdition: state.switchEdition,
      goToPage: state.goToPage,
      goNextPage: state.goNextPage,
      goPrevPage: state.goPrevPage,
      goToSurah: state.goToSurah,
      goToAyah: state.goToAyah,
      selectAyah: state.selectAyah,
      clearSelection: state.clearSelection,
      clearDirection: state.clearDirection,
      reset: state.reset,
    };
  }, [store]);
}

/**
 * Read the persisted edition/page once, when the reader mounts.
 *
 * The store guards against a concurrent second call, which is what a Strict
 * Mode double-mount would otherwise do.
 */
export function useRestoreReader(store: ReaderStore = readerStore): void {
  useEffect(() => {
    void store.getState().restore();
  }, [store]);
}
