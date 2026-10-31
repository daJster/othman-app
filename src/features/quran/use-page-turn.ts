import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { readerStore } from './store/reader-store.instance';
import type { ReaderStore } from './store/reader-store';

/**
 * Page turns, with feedback.
 *
 * Every turn — a swipe, the footer's next/previous (P5.4), a keyboard shortcut
 * — goes through here, so the haptic fires for the same reason everywhere and
 * only when the reader actually moved. `goNextPage` is a no-op at the end of an
 * edition, and buzzing on a no-op is how a reader teaches users that the app is
 * broken.
 *
 * Haptics are best-effort: a device without a taptic engine, a browser without
 * `navigator.vibrate`, or a user who disabled system haptics all resolve to the
 * same silent no-op. The promise is never awaited because a page turn must not
 * wait for the motor.
 */
function tap(): void {
  if (Platform.OS === 'web') return;

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Feedback is optional; the page has already turned.
  });
}

export type PageTurnActions = {
  turnForward: () => void;
  turnBackward: () => void;
};

export function usePageTurn(store: ReaderStore = readerStore): PageTurnActions {
  const turnForward = useCallback(() => {
    const before = store.getState().page;
    store.getState().goNextPage();

    if (store.getState().page !== before) tap();
  }, [store]);

  const turnBackward = useCallback(() => {
    const before = store.getState().page;
    store.getState().goPrevPage();

    if (store.getState().page !== before) tap();
  }, [store]);

  return { turnForward, turnBackward };
}
