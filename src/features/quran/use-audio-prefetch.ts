import { clearPreloadedSource, preload } from 'expo-audio';
import { useEffect } from 'react';

/**
 * Prefetch exactly the next audio item, never a neighbourhood.
 *
 * `shaykhPrefetchUrls` returns the previous ayah and three forward neighbours —
 * useful for a web player warming several files, wrong for a phone on a data
 * plan. The caller therefore passes one URL, derived from the same single-step
 * rule auto-advance uses.
 *
 * `preload`/`clearPreloadedSource` are typed as promises but the web
 * implementation returns `void`. Wrapping in `Promise.resolve` keeps both
 * targets safe: `.catch` on `undefined` would otherwise crash web at runtime.
 * Cleanup releases the previous item so changing ayah or reciter does not grow
 * an unbounded preload cache.
 */
export function useAudioPrefetch(source: string | null): void {
  useEffect(() => {
    if (!source) return;

    void Promise.resolve(preload(source)).catch(() => undefined);

    return () => {
      void Promise.resolve(clearPreloadedSource(source)).catch(() => undefined);
    };
  }, [source]);
}
