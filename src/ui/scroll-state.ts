import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * Whether the active page is scrolled away from its top.
 *
 * The web bar lives outside every screen's scroller, so it cannot read a scroll
 * position of its own. Page scrollers report the boolean here — only when it
 * flips, never once per frame — and the bar subscribes to it.
 *
 * A boolean, not an offset: the bar morphs between two materials with a timed
 * transition, and a per-pixel scrub would tie the material to scroll speed.
 */
let scrolled = false;
const listeners = new Set<() => void>();

export function setPageScrolled(next: boolean): void {
  if (next === scrolled) return;

  scrolled = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function usePageScrolled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => scrolled,
    () => false,
  );
}

/**
 * Report the one transition the bar needs: the page leaving or returning to
 * its top. The caller still owns its own scroll handling; this only watches
 * the same event for the threshold crossing.
 */
export function usePageScrollReporter(enabled = true) {
  const awayFromTop = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    awayFromTop.current = false;
    setPageScrolled(false);
  }, [enabled]);

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enabled) return;

      const next = event.nativeEvent.contentOffset.y > 8;

      if (next === awayFromTop.current) return;

      awayFromTop.current = next;
      setPageScrolled(next);
    },
    [enabled],
  );
}
