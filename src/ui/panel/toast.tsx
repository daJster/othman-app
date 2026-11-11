import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  ReduceMotion,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Icon } from '../icon';
import { Text } from '../text';

/**
 * Transient confirmation messages.
 *
 * A toast answers "did that work?" without taking the user away from what they
 * were doing — the feedback form closes and a quiet note confirms the result.
 * It is not a second dialog: only one is visible at a time, it never carries an
 * action, and it dismisses itself.
 *
 * The provider is optional on purpose. A screen rendered in isolation (a Jest
 * test, a catalog story) calls `useToast()` and simply gets a no-op, which is
 * safer than throwing inside an event handler that has already saved the data.
 */

export type ToastTone = 'default' | 'success' | 'error';

export type ToastOptions = {
  tone?: ToastTone;
  durationMs?: number;
};

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ShowToast = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ShowToast | null>(null);

const DEFAULT_DURATION_MS = 3200;

const TONE_ICON = {
  default: 'info',
  success: 'check-circle',
  error: 'alert-circle',
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setToast(null);
  }, []);

  const show = useCallback<ShowToast>((message, options) => {
    if (timer.current) clearTimeout(timer.current);

    const next: ToastState = {
      id: Date.now(),
      message,
      tone: options?.tone ?? 'default',
    };

    setToast(next);
    timer.current = setTimeout(
      () => setToast(null),
      options?.durationMs ?? DEFAULT_DURATION_MS,
    );
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <ToastViewport key={toast.id} toast={toast} onDismiss={dismiss} />
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): { show: ShowToast } {
  const context = useContext(ToastContext);

  return useMemo(() => ({ show: context ?? (() => undefined) }), [context]);
}

function ToastViewport({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const insets = useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        {
          justifyContent: 'flex-end',
          // Native keeps room for the tab bar; web has no bar and only needs
          // a comfortable edge.
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 24 : 72),
        },
      ]}
    >
      <Animated.View
        entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.System)}
        exiting={FadeOutDown.duration(140).reduceMotion(ReduceMotion.System)}
        className="mx-4 self-center"
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Pressable
          onPress={onDismiss}
          className="max-w-md flex-row items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-lg shadow-black/20 active:opacity-80"
        >
          <Icon
            name={TONE_ICON[toast.tone]}
            size={18}
            tone={toast.tone === 'error' ? 'destructive' : 'primary'}
          />
          <Text variant="label" className="shrink">
            {toast.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
