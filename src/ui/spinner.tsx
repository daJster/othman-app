import { memo, useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { tv, type VariantProps } from 'tailwind-variants';
import { useReducedMotion } from './motion';
import type { SpinnerProps } from './spinner.types';

/**
 * Spinner — native.
 *
 * A ring with a turning arc, drawn with borders and driven on the UI thread.
 * The web gets the SVG spoke spinner in `spinner.web.tsx`; Metro resolves the
 * two by extension, so a screen imports `@/ui/spinner` and never branches.
 *
 * The animation runs entirely off the JS thread. Under reduce-motion the ring
 * stops turning and fades in place instead — holding it still is the wrong
 * answer, because a spinner that does not move reads as one that has hung,
 * which is the single thing a spinner exists to rule out. Reduce motion asks
 * for less travel, not for less news.
 */
/** Milliseconds for one full turn. */
const SPIN_DURATION = 800;
/** Milliseconds for one half of the fade that stands in for the turn. */
const PULSE_DURATION = 900;
/** How far down the fade goes. Faint enough to read as a pulse, not a flicker. */
const PULSE_FLOOR = 0.35;

const spinnerVariants = tv({
  base: 'rounded-full border-2 border-muted border-t-primary',
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const Spinner = memo(function Spinner({
  className,
  size,
  label,
  color,
  trackColor,
}: SpinnerProps & VariantProps<typeof spinnerVariants>) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: reducedMotion ? PULSE_DURATION : SPIN_DURATION,
        easing: reducedMotion ? Easing.inOut(Easing.ease) : Easing.linear,
      }),
      -1,
      // The turn restarts where it began, because a full circle already ends
      // where it started. The fade turns around, because a pulse that snapped
      // back to full brightness would be the flicker the setting avoids.
      reducedMotion,
    );

    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]);

  /*
   * One style sets both properties either case needs. The two are swapped on
   * the same view when the setting changes under a mounted spinner, and an
   * animated property that one case drops is not reset by the other — it is
   * left at whatever it was last given, which would strand a half-faded ring
   * at that opacity for the rest of its life.
   */
  const animatedStyle = useAnimatedStyle(() =>
    reducedMotion
      ? {
          opacity: interpolate(progress.value, [0, 1], [1, PULSE_FLOOR]),
          transform: [{ rotate: '0deg' }],
        }
      : {
          opacity: 1,
          transform: [{ rotate: `${progress.value * 360}deg` }],
        },
  );

  const announced = label != null;

  return (
    <Animated.View
      accessibilityRole={announced ? 'progressbar' : undefined}
      accessibilityLabel={label}
      accessibilityState={{ busy: announced }}
      accessibilityElementsHidden={!announced}
      importantForAccessibility={announced ? 'auto' : 'no-hide-descendants'}
      // After the class, so a colour passed here wins over the theme's. The
      // track goes on every side and the arc on the top, the same split the
      // classes make, so setting one never repaints the other.
      style={[
        trackColor ? { borderColor: trackColor } : null,
        color ? { borderTopColor: color } : null,
        animatedStyle,
      ]}
      className={spinnerVariants({ size, className })}
    />
  );
});

export type { SpinnerProps, SpinnerSize } from './spinner.types';
