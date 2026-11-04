import { useSyncExternalStore } from 'react';
import { Dimensions } from 'react-native';

/**
 * The `md` breakpoint as a boolean.
 *
 * Layout is CSS' job (`md:` utilities), and stays that way. A handful of
 * decisions cannot be expressed in a class, though: which of the two hero
 * encodes to use, how many dust motes to draw. Those are JS.
 *
 * Read through `useSyncExternalStore` rather than `useState` + `useEffect` so
 * the static web export hydrates cleanly: the server snapshot is `false`, the
 * first client render agrees with the HTML, and the real viewport is applied
 * immediately afterwards. A `useEffect` write would do the same job but costs a
 * cascading render on every resize and is exactly what the lint rule forbids.
 *
 * 768 is not a magic number here: it is `md` in Tailwind and the width the
 * product brief names as the split between phone and desktop.
 */
const WIDE = 768;

function subscribe(onChange: () => void) {
  const subscription = Dimensions.addEventListener('change', onChange);

  return () => subscription.remove();
}

function getSnapshot(): boolean {
  return Dimensions.get('window').width >= WIDE;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsWide(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
