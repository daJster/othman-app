import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Whether the visitor asked the platform to reduce motion.
 *
 * Two sources, because neither is complete: on the web the CSS media query is
 * the one browsers and iOS' "reduce motion" switch both honour, and it can be
 * read synchronously — so the first paint is already correct instead of
 * animating for a frame and then stopping. On native the OS accessibility
 * setting is the only source, it is asynchronous, and it can change while the
 * app is open.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the value is
 * external state, not derived state, and reading it during render is what keeps
 * the static web export's first paint in step with the client's. Callers decide
 * what "reduced" means for their surface — the dust field holds still, and the
 * hero film is not gated on it. There is no global switch
 * that silently removes motion, because a still frame is a better answer than a
 * missing element.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

/** Web: read live from the media query. Native: the last value we were told. */
let cached = false;
let query: MediaQueryList | null = null;
const listeners = new Set<() => void>();
let bound = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function mediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return null;
  }

  query ??= window.matchMedia(QUERY);

  return query;
}

function getSnapshot(): boolean {
  if (Platform.OS === 'web') {
    return mediaQuery()?.matches ?? false;
  }

  return cached;
}

function getServerSnapshot(): boolean {
  // The export renders without a window; every visitor starts animating and
  // is corrected on the first client read if their OS says otherwise.
  return false;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (!bound) {
    bound = true;

    const media = Platform.OS === 'web' ? mediaQuery() : null;

    if (media) {
      media.addEventListener('change', emit);
    } else if (Platform.OS !== 'web') {
      AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        cached = enabled;
        emit();
      });

      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        cached = enabled;
        emit();
      });
    }
  }

  return () => {
    listeners.delete(listener);
  };
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
