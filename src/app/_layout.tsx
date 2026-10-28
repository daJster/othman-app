import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaListener,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { LayoutDirection, Uniwind, useResolveClassNames } from 'uniwind';
import { useDirection } from '@/i18n';
import { BootProvider } from '@/providers/boot-provider';
import { LanguageProvider } from '@/providers/language-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { queryClient } from '@/services/query';

/**
 * Root layout.
 *
 * `@/global.css` is imported here — and only here — as the first import. It
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
 *                            wraps the theme provider — so language must be
 *                            above both. It renders nothing itself.
 *  `LayoutDirection`         scopes `rtl:`/`ltr:` variants for the whole tree.
 *  `ThemeProvider`           must be above the gate, which reads its `ready`.
 *  `QueryClientProvider`     stateless config; above the gate so a screen can
 *                            never mount with a missing client.
 *  `BootProvider`            holds the splash until theme + language + fonts
 *                            have settled, and withholds everything below.
 *
 * `AuthProvider` is **not** here: it arrives with P3.3, which ports the
 * `onAuthStateChanged` → profile → `mergeAuthWithProfile` flow and wires
 * `Stack.Protected`. Nothing is auth-gated until then.
 *
 * No `document`/`window`/`localStorage` is touched at module scope — Expo web
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
          <BootProvider>
            <RootNavigator />
          </BootProvider>
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
 * The root stack holds the tab group (the app), the account sub-screens and the
 * reader. The reader is a sibling rather than a tab child so it can present
 * full-screen over the tab bar, which is the point of a mushaf view. The edit
 * sheet is a `formSheet`: it is a task, not a destination, so it must not become
 * a tab or a pushed page. Auth gating (`Stack.Protected`) joins this list in
 * P3.3.
 */
function RootNavigator() {
  const contentStyle = useResolveClassNames('bg-background');

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
      <Stack.Screen
        name="reader/[page]"
        options={{ presentation: 'fullScreenModal', headerShown: false }}
      />
    </Stack>
  );
}
