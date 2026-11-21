import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { getMeetingStatusConfig, type StatusTone } from '@/core/config';
import type { MeetingStatus } from '@/core/types';
import { cn } from '@/ui/cn';
import { Icon, type IconTone } from '@/ui/icon';
import { useReducedMotion } from '@/ui/motion';
import { Text } from '@/ui/text';

/**
 * The status marker on a meeting card.
 *
 * A status is a glance, not a sentence: an icon carries the meaning, and the
 * translated label stays beside it as the readable, accessible text. The old
 * filled badge spent a coloured chip and a border on four words; this spends
 * one glyph and a caption line.
 *
 * Two states are live and move:
 *  - `soon` pulses the whole marker — icon and label — because the session is
 *    about to begin;
 *  - `now` swaps the icon for a green dot with a fading wave that ripples once
 *    a second, because the session is running at this moment.
 *
 * Under reduce motion both hold still: the dot and the label still say "now";
 * only the movement is dropped.
 */

const ICON_SIZE = 14;
const DOT_SIZE = 10;
/** One full fade in and out of the soon marker. */
const PULSE_DURATION = 1100;
/** One second per ripple: long enough to read as a pulse, not a flicker. */
const WAVE_DURATION = 1000;
/** How far the wave grows past the dot before it fades out. */
const WAVE_SPREAD = 2.2;

const TONE_TEXT: Readonly<Record<StatusTone, string>> = {
  positive: 'text-success',
  info: 'text-info',
  neutral: 'text-muted-foreground',
};

const TONE_ICON: Readonly<Record<StatusTone, IconTone>> = {
  positive: 'success',
  info: 'info',
  neutral: 'muted',
};

export type MeetingStatusMarkerProps = {
  status: MeetingStatus;
};

export function MeetingStatusMarker({ status }: MeetingStatusMarkerProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const config = getMeetingStatusConfig(status);
  const animated = config.pulse && !reducedMotion;
  const iconState = config.icon !== null;

  const progress = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      cancelAnimation(progress);
      cancelAnimation(breath);
      progress.value = 0;
      breath.value = 0;
      return;
    }

    progress.value = withRepeat(
      withTiming(1, {
        duration: iconState ? PULSE_DURATION : WAVE_DURATION,
        easing: iconState ? Easing.inOut(Easing.ease) : Easing.out(Easing.ease),
      }),
      -1,
      // The pulse fades back through the same path; the wave restarts.
      iconState,
    );

    if (!iconState) {
      breath.value = withRepeat(
        withTiming(1, {
          // Half the wave: up and back down land on one ripple a second.
          duration: WAVE_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    }

    return () => {
      cancelAnimation(progress);
      cancelAnimation(breath);
    };
  }, [animated, iconState, progress, breath]);

  /**
   * The whole marker's breath for `soon`. The label is included on purpose:
   * a pulsing icon beside still text reads as two separate objects, not one
   * state. Opacity, not scale, so the words do not shimmer.
   */
  const glowStyle = useAnimatedStyle(() => {
    if (!animated || !iconState) return { opacity: 1 };

    return { opacity: 0.45 + progress.value * 0.55 };
  });

  /** A small scale on the icon only, so the glyph leads the breath. */
  const pulseStyle = useAnimatedStyle(() => {
    if (!animated || !iconState) return { transform: [{ scale: 1 }] };

    return { transform: [{ scale: 1 + progress.value * 0.1 }] };
  });

  /** The live dot's expanding, fading ring. */
  const waveStyle = useAnimatedStyle(() =>
    animated && !iconState
      ? {
          opacity: (1 - progress.value) * 0.45,
          transform: [{ scale: 1 + progress.value * WAVE_SPREAD }],
        }
      : { opacity: 0, transform: [{ scale: 1 }] },
  );

  /** The core dot breathes with the wave, so the dot itself is alive. */
  const dotStyle = useAnimatedStyle(() =>
    animated && !iconState
      ? { transform: [{ scale: 1 + breath.value * 0.22 }] }
      : { transform: [{ scale: 1 }] },
  );

  return (
    <View
      testID={`meeting-status:${status}`}
      className="shrink-0 flex-row items-center gap-1 self-start pt-0.5"
    >
      {config.icon ? (
        <Animated.View
          style={glowStyle}
          className="flex-row items-center gap-1"
        >
          <Animated.View style={pulseStyle}>
            <Icon
              name={config.icon}
              size={ICON_SIZE}
              tone={TONE_ICON[config.tone]}
            />
          </Animated.View>
          <Text variant="caption" className={TONE_TEXT[config.tone]}>
            {t(config.labelKey)}
          </Text>
        </Animated.View>
      ) : (
        <>
          <View
            style={{ width: DOT_SIZE, height: DOT_SIZE }}
            className="items-center justify-center"
          >
            <Animated.View
              style={[
                // An absolutely positioned view with no size collapses to
                // 0×0, and scaling zero is still zero. The wave must start at
                // the dot's own diameter before it can grow past it.
                { width: DOT_SIZE, height: DOT_SIZE },
                waveStyle,
              ]}
              className={cn(
                'absolute rounded-full',
                config.tone === 'positive'
                  ? 'bg-success'
                  : 'bg-muted-foreground',
              )}
              // The wave is decorative: the dot and the label carry the state.
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Animated.View
              style={[
                { width: DOT_SIZE * 0.6, height: DOT_SIZE * 0.6 },
                dotStyle,
              ]}
              className={cn(
                'rounded-full',
                config.tone === 'positive'
                  ? 'bg-success'
                  : 'bg-muted-foreground',
              )}
            />
          </View>

          <Text variant="caption" className={TONE_TEXT[config.tone]}>
            {t(config.labelKey)}
          </Text>
        </>
      )}
    </View>
  );
}
