import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { Uniwind } from 'uniwind';
import { STORAGE_KEYS, storageService } from '@/platform/storage';

/**
 * Theme state.
 *
 * Three modes, not two: `system` is the default and the only one that follows
 * the OS, `light`/`dark` pin the app. The stored value is the *mode*, never the
 * resolved colour scheme — storing "dark because the phone was dark" would
 * freeze the app on dark even after the user turns the system to light.
 *
 * Uniwind owns the actual switch (`setTheme` also syncs `Appearance`, so
 * native alerts and dialogs follow). This provider owns persistence and
 * hydration only — the splash gate is `BootProvider`, which needs to know both
 * this state and the font state and therefore sits below both.
 */

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODES = ['light', 'dark', 'system'] as const;

/** Dark is the app's identity (`index.html` ships `class="dark"`), so an
 * unknown system value falls back to it rather than to a white flash. */
const DEFAULT_MODE: ThemeMode = 'system';

export function isThemeMode(value: unknown): value is ThemeMode {
  return (
    typeof value === 'string' &&
    (THEME_MODES as readonly string[]).includes(value)
  );
}

export type ThemeModeContextValue = {
  mode: ThemeMode;
  /** The colour scheme actually in effect — resolve `system` through the OS. */
  isDark: boolean;
  /** False until the stored mode has been read and applied. `BootProvider`
   * waits on this; nothing else should branch on it. */
  ready: boolean;
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [hydrated, setHydrated] = useState(false);
  const systemScheme = useColorScheme();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored: unknown = await storageService.getItem(
        STORAGE_KEYS.theme,
        DEFAULT_MODE,
      );
      if (cancelled) return;

      const initial = isThemeMode(stored) ? stored : DEFAULT_MODE;

      // Applied while still covered by the splash, so the first visible frame is
      // already the right theme.
      Uniwind.setTheme(initial);
      setModeState(initial);
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    // The switch is synchronous and local: the UI must not wait for storage.
    Uniwind.setTheme(next);
    setModeState(next);

    void storageService.setItem(STORAGE_KEYS.theme, next);
  }, []);

  // `useColorScheme()` returns null when the OS has no preference (or on SSR);
  // dark is the safer default for this app.
  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme !== 'light');

  const value = useMemo(
    () => ({ mode, isDark, ready: hydrated, setMode }),
    [mode, isDark, hydrated, setMode],
  );

  // Children always render. Gating lives in `BootProvider`, which is a child of
  // this provider and therefore cannot mount if this returns `null` — and the
  // splash would never be released.
  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const value = useContext(ThemeModeContext);

  if (!value) {
    throw new Error('useThemeMode must be used inside <ThemeProvider>');
  }

  return value;
}

/**
 * The same context, but nullable.
 *
 * Brand artwork and loading frames are rendered in isolation by tests and by
 * components that can sit above the provider; they need the resolved scheme
 * without requiring the app shell. Callers fall back to `useColorScheme()`.
 */
export function useOptionalThemeMode(): ThemeModeContextValue | null {
  return useContext(ThemeModeContext);
}
