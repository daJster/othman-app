import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { DAILY_DUAAS, type PracticeDuaa } from './duaa-fixtures';
import { useDirection } from '@/i18n';
import { pickLocalized } from '@/features/home/circle-format';
import { GlassFill } from '@/ui/glass';
import { cn } from '@/ui/cn';
import { NativeSheetContent } from '@/ui/native-sheet-content';
import { SheetHeader } from '@/ui/sheet-header';
import { Text } from '@/ui/text';
import { ThemedBottomSheet } from '@/ui/themed-bottom-sheet';
import { DUAA_MAX, DUAA_TARGET } from '@/core/domain/practice/practice';

/**
 * The three duaas, in a bottom sheet.
 *
 * **Hold the card, do not swipe.** Dragging a card is unreliable with a
 * trackpad, so the card itself is the press-and-hold control: one second of
 * pressure fills it with a brass wash, then it turns green and the next duaa
 * replaces it. The same control works on a phone, where it is also easier than
 * a swipe inside a sheet that can itself be dragged down.
 *
 * The deck cycles the three mock duaas so the count can pass the gauge's target
 * (3); the gauge is full at three and the count keeps rising. Completion is
 * reported when the hold finishes — there is no separate Done step. The label
 * under the card is the only instruction.
 *
 * The fill is a plain RN `Animated.Value`, not a worklet: the control animates
 * one width, and keeping worklets out of this sheet is what lets the static web
 * render bundle stay simple. JS only hears the two ends (finished, cancelled).
 */
export type DuaaSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** How many duaas have been read today (may pass the gauge's target). */
  value: number;
  onComplete: () => void;
};

const HOLD_MS = 1000;
/** How long the green beat lasts before the next card appears. */
const GREEN_HOLD_MS = 900;

export function DuaaSheet({
  open,
  onOpenChange,
  value,
  onComplete,
}: DuaaSheetProps) {
  const { t } = useTranslation();
  const { language } = useDirection();
  const window = useWindowDimensions();
  const sheetWidth =
    Platform.OS === 'web' ? undefined : Math.max(0, window.width - 32);

  // Three mock duaas, repeated: the count is the source of truth, not the deck.
  const index = value % DAILY_DUAAS.length;
  const current = value >= DUAA_MAX ? null : DAILY_DUAAS[index];
  const phrases = [
    t('practice.duaa.phrases.mashaallah'),
    t('practice.duaa.phrases.alhamdulillah'),
    t('practice.duaa.phrases.subhanallah'),
  ];

  return (
    <ThemedBottomSheet
      isPresented={open}
      onDismiss={() => onOpenChange(false)}
      showDragIndicator={Platform.OS !== 'web'}
      snapPoints={Platform.OS === 'web' ? undefined : ['half']}
      testID="practice-duaa-sheet"
    >
      <NativeSheetContent>
        <View
          style={sheetWidth ? { width: sheetWidth } : undefined}
          className={cn(
            'gap-5 p-4 pb-6',
            Platform.OS === 'web' && 'mx-auto w-full max-w-md py-6',
          )}
        >
          <SheetHeader title={t('practice.duaa.title')} />

          <Text variant="caption" tone="muted">
            {value >= DUAA_TARGET
              ? t('practice.duaa.more', { done: value })
              : t('practice.duaa.description', {
                  done: value,
                  target: DUAA_TARGET,
                })}
          </Text>

          <View className="min-h-40 justify-center">
            {current ? (
              <DuaaCard
                key={value}
                duaa={current}
                language={language}
                label={t('practice.duaa.hold')}
                hint={t('practice.duaa.holdHint')}
                phrase={phrases[value % phrases.length]}
                onComplete={onComplete}
              />
            ) : (
              <View className="items-center gap-2 py-6">
                <Text variant="label">
                  {t('practice.duaa.finished', { max: DUAA_MAX })}
                </Text>
                <Text variant="caption" tone="muted">
                  {t('practice.duaa.finishedHint')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </NativeSheetContent>
    </ThemedBottomSheet>
  );
}

/**
 * The card and its press control.
 *
 * A `Pressable` for the press lifecycle, an `Animated.View` for the fill. The
 * beat after 100% is deliberate: the card wiggles, the green washes in and out,
 * and the hint becomes a short praise. Without it the card snapping back and
 * the next duaa appearing in the same frame reads as a miss, not a confirmation.
 */
function DuaaCard({
  duaa,
  language,
  label,
  hint,
  phrase,
  onComplete,
}: {
  duaa: PracticeDuaa;
  language: 'ar' | 'en';
  label: string;
  hint: string;
  /** The praise shown at 100%, e.g. "Mashaallah". */
  phrase: string;
  onComplete: () => void;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const [green] = useState(() => new Animated.Value(0));
  const [wiggle] = useState(() => new Animated.Value(0));
  const [full, setFull] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    setFull(true);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(wiggle, {
          toValue: 1,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: -1,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: 0.7,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: -0.5,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: 0,
          duration: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(green, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.delay(360),
        Animated.timing(green, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    timer.current = setTimeout(() => {
      progress.setValue(0);
      green.setValue(0);
      wiggle.setValue(0);
      setFull(false);
      onComplete();
    }, GREEN_HOLD_MS);
  }, [green, onComplete, progress, wiggle]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
      progress.stopAnimation();
      green.stopAnimation();
      wiggle.stopAnimation();
    },
    [green, progress, wiggle],
  );

  const fill = {
    width: progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
  };
  const greenStyle = { opacity: green };
  const wiggleStyle = {
    transform: [
      {
        rotate: wiggle.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-2deg', '2deg'],
        }),
      },
    ],
  };

  const start = () => {
    if (full) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) finish();
    });
  };

  const stop = () => {
    if (full) return;
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  };

  return (
    <Animated.View style={wiggleStyle}>
      <Pressable
        testID="practice-duaa-hold"
        accessibilityRole="button"
        accessibilityLabel={full ? phrase : label}
        accessibilityHint={hint}
        onPressIn={start}
        onPressOut={stop}
        // Physical LTR in both languages: progress fills in one direction.
        style={{ direction: 'ltr' }}
        className={cn(
          'relative overflow-hidden rounded-card border',
          full ? 'border-success' : 'border-glass-edge',
        )}
      >
        {/* Quiet glass: this card sits on the sheet, so the standard rim would
            double against the sheet's own edge. Fewer highlights, deeper frost. */}
        <GlassFill weight="panel" radius="card" quiet />

        <Animated.View
          pointerEvents="none"
          style={fill}
          className="absolute inset-y-0 left-0 bg-brass/20"
        />
        {/* The green wash pulses over the card rather than recolouring it:
            the fill is the progress, the pulse is the celebration. */}
        <Animated.View
          pointerEvents="none"
          style={greenStyle}
          className="absolute inset-0 bg-success/30"
        />

        <View className="gap-2 p-4">
          <Text variant="label" className="leading-snug">
            {pickLocalized(duaa.title, language)}
          </Text>
          <Text variant="caption" tone="muted" className="leading-relaxed">
            {pickLocalized(duaa.body, language)}
          </Text>
        </View>
      </Pressable>

      <Text
        variant="caption"
        tone="muted"
        align="center"
        className="mt-2 leading-relaxed"
      >
        {full ? phrase : label}
      </Text>
    </Animated.View>
  );
}
