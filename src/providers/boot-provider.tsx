import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { useAppFonts } from '@/providers/font-provider';
import { useLanguage } from '@/providers/language-provider';
import { useThemeMode } from '@/providers/theme-provider';

/**
 * Boot gate.
 *
 * Three asynchronous things have to be true before the first frame is worth
 * showing: the stored theme must be applied (otherwise the app flashes the
 * wrong scheme), the stored language must be applied (otherwise it flashes the
 * wrong strings *and* the wrong direction), and the fonts must be loaded
 * (otherwise Arabic renders as tofu and then swaps mid-screen). This provider
 * waits for all three and only then releases the splash — the tree below it is
 * not mounted until that moment, so there is no "partially ready" frame.
 *
 * The inputs are independent on purpose: a font failure must not hold the
 * splash forever. A missing font degrades typography; a stuck splash bricks the
 * app, so the error path reveals the UI and logs instead.
 *
 * The `preventAutoHideAsync` call is at module scope, not in an effect: an
 * effect runs after the first frame, which is the frame this exists to hide.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already prevented (Fast Refresh) or unsupported (tests, some web
  // environments). Neither is a reason to crash boot.
});

export function BootProvider({ children }: { children: ReactNode }) {
  const { ready: themeReady } = useThemeMode();
  const { ready: languageReady } = useLanguage();
  const [fontsLoaded, fontError] = useAppFonts();

  // `useFonts` reports `loaded` as a tuple member, but a thrown loader leaves
  // both false; treat an error as "settled" rather than "still loading".
  const booted =
    themeReady && languageReady && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (!booted) return;

    SplashScreen.hideAsync().catch(() => {
      // No splash on web, and hiding twice is a no-op — never crash boot for it.
    });
  }, [booted]);

  if (!booted) return null;

  return children;
}
