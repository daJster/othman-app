import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Redirect, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaListener,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { LayoutDirection, Uniwind, useResolveClassNames } from 'uniwind';
import { useDirection } from '@/i18n';
import { isPrivateAppPath } from '@/features/navigation/private-path';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { BootProvider } from '@/providers/boot-provider';
import { LanguageProvider } from '@/providers/language-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { queryClient } from '@/services/query';

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
 *  `LanguageProvider`        direction is needed by `LayoutDirection`, which
 *                            wraps the theme provider ÔÇö so language must be
 *                            above both. It renders nothing itself.
 *  `LayoutDirection`         scopes `rtl:`/`ltr:` variants for the whole tree.
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

/** Split from `RootLayout` so the direction hook runs below `LanguageProvider`. */
function AppShell() {
  const { isRTL } = useDirection();

  return (
    <LayoutDirection rtl={isRTL}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BootProvider>
              <RootNavigator />
            </BootProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </LayoutDirection>
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

  // Signed-out private paths must be redirected above the tab navigator.
  // On native, hidden tabs are removed from the navigator's route table, so a
  // link to `/meetings` can otherwise fall back to Home before that screen's
  // own `RequireAuth` mounts. The screen-level gate remains as defence in depth.
  if (status !== 'restoring' && !user && isPrivateAppPath(pathname)) {
    return (
      <Redirect
        href={{
          pathname: '/auth/sign-in',
          params: { returnTo: pathname },
        }}
      />
    );
  }

  return (
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
      <Stack.Screen name="account/progress" />
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
  );
}
