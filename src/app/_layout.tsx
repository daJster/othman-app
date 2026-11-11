import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { PortalHost } from '@rn-primitives/portal';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  usePathname,
  useRouter,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaListener,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { Uniwind, useResolveClassNames } from 'uniwind';
import { isPrivateAppPath } from '@/features/navigation/private-path';
import { ApiEventsBridge } from '@/api';
import { AUTH_GATING_ENABLED } from '@/features/auth/auth-policy';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { BootProvider } from '@/providers/boot-provider';
import { LanguageProvider } from '@/providers/language-provider';
import { ThemeProvider, useThemeMode } from '@/providers/theme-provider';
import { queryClient } from '@/services/query';
import { ToastProvider } from '@/ui/panel';

/**
 * Root layout.
 *
 * `@/global.css` is imported here ÔÇö and only here ÔÇö as the first import. It
 * must not move to the entry file, or Fast Refresh stops picking up token
 * changes.
 *
 * Provider order, outermost first, and why each step is where it is:
 *
 *  `GestureHandlerRootView`  every gesture in the app (the reader's page turn)
 *                            needs it, and it must wrap the navigator.
 *  `SafeAreaProvider`        one source of insets for native chrome and for
 *                            Uniwind's `*-safe` utilities.
 *  `SafeAreaListener`        pushes those insets into Uniwind; without it
 *                            `pt-safe` resolves to nothing.
 *  `LanguageProvider`        owns the stored language and exposes `ready`; it
 *                            also keeps `<html lang>` in step on web. It renders
 *                            nothing itself.
 *  `ThemeProvider`           must be above the gate, which reads its `ready`.
 *  `QueryClientProvider`     stateless config; above the gate so a screen can
 *                            never mount with a missing client.
 *  `AuthProvider`            one session observer for the app. It sits inside
 *                            the query client because the profile is read
 *                            through the shared account query, and above the
 *                            boot gate because the gate waits for session
 *                            restoration as well as theme/language/fonts.
 *  `BootProvider`            holds the splash until theme + language + fonts
 *                            have settled, and withholds everything below.
 *
 * Private routes are wrapped in `RequireAuth` individually (the registry owns
 * `access`); the root stack stays public so Home, Quran and the reader never
 * pay for an auth redirect. Sign-in is a modal, so a protected deep link can
 * present it over the destination it is about to resume.
 *
 * `AuthProvider` is **not** here: it arrives with P3.3, which ports the
 * `onAuthStateChanged` ÔåÆ profile ÔåÆ `mergeAuthWithProfile` flow and wires
 * `Stack.Protected`. Nothing is auth-gated until then.
 *
 * No `document`/`window`/`localStorage` is touched at module scope ÔÇö Expo web
 * renders this file in Node when `web.output` is `static`.
 */
export default function RootLayout() {
  /**
   * The app's own ground, painted on the root view.
   *
   * Without it the outermost surface is react-native-web's default `#f2f2f2`,
   * which only becomes visible where content deliberately does not reach — the
   * cut-outs outside a rounded card, or either side of a `max-w-3xl` column.
   * In dark mode those corners read as white notches. One resolved token here
   * means every screen's "outside" is the page ground in both schemes.
   */
  const ground = useResolveClassNames('bg-background');

  return (
    <GestureHandlerRootView style={[{ flex: 1 }, ground]}>
      <SafeAreaProvider>
        <SafeAreaListener onChange={handleSafeAreaChange}>
          <LanguageProvider>
            <AppShell />
          </LanguageProvider>
        </SafeAreaListener>
      </SafeAreaProvider>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

/**
 * Module scope, not an inline arrow: `SafeAreaListener` re-subscribes when its
 * `onChange` identity changes, and insets update on every rotation.
 */
function handleSafeAreaChange({
  insets,
}: {
  insets: { top: number; right: number; bottom: number; left: number };
}) {
  Uniwind.updateInsets(insets);
}

/**
 * Providers only.
 *
 * `LayoutDirection` used to wrap this tree and mirror every `rtl:` variant and
 * logical utility with the language. Both are gone: the app keeps one physical
 * layout, so there is nothing left for a direction context to scope. Text
 * direction lives in `@/ui/text` and `@/ui/input`.
 */
function AppShell() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BootProvider>
            <ToastProvider>
              <RootNavigator />
              <ApiEventsBridge />
              <PortalHost />
            </ToastProvider>
          </BootProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/**
 * The navigator.
 *
 * `contentStyle` comes from the theme token rather than a literal so the gap
 * between screens during a transition is the app's own background in both
 * schemes. Navigation props take style objects, not classNames, so the token is
 * resolved through `useResolveClassNames` instead of duplicating a hex value.
 *
 * The root stack holds the tab group (the app), the account sub-screens, About
 * and the reader. The reader is a sibling rather than a tab child so it can
 * present full-screen over the tab bar, which is the point of a mushaf view. The
 * edit sheet is a `formSheet`: it is a task, not a destination, so it must not
 * become a tab or a pushed page. Sign-in is a `modal` for the same reason: it
 * is an interruption, and it keeps its own close/back affordances.
 */
function RootNavigator() {
  const contentStyle = useResolveClassNames('bg-background');
  const { user, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useThemeMode();

  /**
   * React Navigation paints its own root behind every screen, from the theme it
   * was given. Left alone that is `#f2f2f2`, which shows wherever content
   * deliberately stops — the cut-outs outside a rounded card, the margins
   * beside a `max-w-3xl` column — and reads as white corners in dark mode.
   * `screenOptions.contentStyle` only covers each screen, not the container
   * behind them, so the ground has to come through the theme.
   */
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    const ground = String(
      contentStyle.backgroundColor ?? base.colors.background,
    );

    return {
      ...base,
      colors: { ...base.colors, background: ground, card: ground },
    };
  }, [contentStyle.backgroundColor, isDark]);

  // Signed-out private paths must be redirected above the tab navigator.
  // On native, hidden tabs are removed from the navigator's route table, so a
  // link to `/meetings` can otherwise fall back to Home before that screen's
  // own `RequireAuth` mounts. Keep the Stack mounted and navigate imperatively:
  // returning a root-level `<Redirect>` replaces the navigator, which web
  // tolerates but Android needs in order to present the sign-in modal.
  useEffect(() => {
    if (!AUTH_GATING_ENABLED) return;
    if (status === 'restoring' || user || !isPrivateAppPath(pathname)) return;

    router.replace({
      pathname: '/auth/sign-in',
      params: { returnTo: pathname },
    });
  }, [pathname, router, status, user]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="account/edit"
          options={{
            presentation: 'formSheet',
            // Nearly full height, expandable: the form is taller than a compact
            // sheet, and the user can still pull it down when nothing is saving.
            sheetAllowedDetents: [0.9, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen
          name="meetings/edit"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.9, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen name="account/progress" />
        <Stack.Screen name="admin/members" options={{ presentation: 'card' }} />
        <Stack.Screen
          name="admin/members/edit"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.9, 1],
            sheetInitialDetentIndex: 0,
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen name="quran/history" />
        <Stack.Screen name="quran/records" />
        <Stack.Screen name="about" />
        <Stack.Screen
          name="auth/sign-in"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="reader/[page]"
          options={{ presentation: 'fullScreenModal', headerShown: false }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}
