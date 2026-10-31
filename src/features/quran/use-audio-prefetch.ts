import { clearPreloadedSource, preload } from 'expo-audio';
import { useEffect } from 'react';
import { Platform } from 'react-native';

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
    // `expo-audio`'s web preload uses fetch, and the audio CDN does not send
    // CORS headers; the browser blocks it. The audio element itself still
    // plays, so skipping prefetch on web avoids a guaranteed console error and
    // a wasted request.
    if (Platform.OS === 'web' || !source) return;

    void Promise.resolve(preload(source)).catch(() => undefined);

    return () => {
      void Promise.resolve(clearPreloadedSource(source)).catch(() => undefined);
    };
  }, [source]);
}
