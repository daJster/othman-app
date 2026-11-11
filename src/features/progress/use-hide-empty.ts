import { useEffect, useState } from 'react';
import { STORAGE_KEYS, storageService } from '@/platform/storage';

/**
 * "Hide not-started surahs" for the grid.
 *
 * The full grid is 114 cells, which is the point of an overview — but once a
 * student is working through a juz', the untouched cells are noise. The
 * preference is persisted, so the view they chose is the view they return to;
 * it is deliberately local and not part of the account profile.
 *
 * The first render is always `false` (the honest default) and the stored value
 * lands one tick later. A grid that briefly shows every surah is better than a
 * grid that hides rows before it knows the preference.
 */
export function useHideEmptyProgress(): {
  hideEmpty: boolean;
  setHideEmpty: (next: boolean) => void;
  ready: boolean;
} {
  const [hideEmpty, setHideEmptyState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored: unknown = await storageService.getItem(
        STORAGE_KEYS.progressHideEmpty,
        false,
      );

      if (cancelled) return;
      if (typeof stored === 'boolean') setHideEmptyState(stored);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setHideEmpty = (next: boolean) => {
    setHideEmptyState(next);
    void storageService.setItem(STORAGE_KEYS.progressHideEmpty, next);
  };

  return { hideEmpty, setHideEmpty, ready };
}
