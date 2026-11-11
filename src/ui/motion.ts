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
 * what "reduced" means for their surface — the dust field holds still, the
 * hero film does not autoplay, and the card's morph crossfades instead of
 * springing. There is no global switch that silently removes motion, because a
 * still frame is a better answer than a missing element.
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

/**
 * Whether the visitor asked for less transparency.
 *
 * A different preference from reduced motion, and Apple treats it separately:
 * translucent materials become solid rather than disappearing. Web-only — no
 * native equivalent is exposed through React Native — so a native render
 * answers `false` and keeps the platform's own material.
 *
 * Safari and Firefox honour the query today; Chromium does not yet, where this
 * simply never matches.
 */
const TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';

let transparentQuery: MediaQueryList | null = null;
const transparencyListeners = new Set<() => void>();
let transparencyBound = false;

function emitTransparency() {
  transparencyListeners.forEach((listener) => listener());
}

function transparencyMedia(): MediaQueryList | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined' || !window.matchMedia) return null;

  transparentQuery ??= window.matchMedia(TRANSPARENCY_QUERY);

  return transparentQuery;
}

function getTransparencySnapshot(): boolean {
  return transparencyMedia()?.matches ?? false;
}

function subscribeTransparency(listener: () => void) {
  transparencyListeners.add(listener);

  if (!transparencyBound) {
    transparencyBound = true;
    transparencyMedia()?.addEventListener('change', emitTransparency);
  }

  return () => {
    transparencyListeners.delete(listener);
  };
}

export function useReducedTransparency(): boolean {
  return useSyncExternalStore(
    subscribeTransparency,
    getTransparencySnapshot,
    getServerSnapshot,
  );
}
