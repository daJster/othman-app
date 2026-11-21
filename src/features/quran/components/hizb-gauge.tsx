import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { useReducedMotion } from '@/ui/motion';

/**
 * Today's goal, as a native ring.
 *
 * The band owns the meaning; this adapter owns the drawing. The catalog's own
 * gauge is a static meter and deliberately has no motion, so the arc is drawn
 * here instead of wrapping it: a value can only animate if it reaches the
 * `strokeDashoffset` behind the circle, and a vendored file is not this
 * feature's to change.
 *
 * The shared value starts at zero and is driven to the target in an effect, so
 * the ring grows on mount and transitions on every later value change. Reduced
 * motion writes the target directly, snapping the ring to its value. The arc is
 * full-circle, starting at 12 o'clock, like the catalog port.
 *
 * Stroke colours travel through `useCSSVariable` rather than `className`
 * because `react-native-svg` has no className styling — and the values are
 * already hex by the time Uniwind resolves them, which is what SVG's native
 * colour parsing needs.
 *
 * The gauge is presentational: the fraction beside it is the accessible metric,
 * so the ring is hidden from assistive technology instead of announcing the
 * same progress twice.
 */
const DEFAULT_SIZE = 136;
const DEFAULT_STROKE_WIDTH = 10;
const ARC_DURATION = 600;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type HizbGaugeProps = {
  /** Pages read today, in the same unit as `max`. */
  value: number;
  /** Pages the day's goal asks for. */
  max: number;
  /** Outer diameter in points. */
  size?: number;
  /** Arc thickness in points. */
  strokeWidth?: number;
  /**
   * Arc colour. `brass` is the resting gold; `success` marks this gauge's own
   * target as met; `gold` is the day-wide state, when every gauge is full.
   */
  tone?: 'brass' | 'success' | 'gold' | 'white';
  /** Centered readout: the count the ring is drawing. */
  centerLabel?: string;
  /** Accessible name for the gauge, announced as a progressbar. */
  accessibilityLabel?: string;
};

/** `transparent` keeps an unresolved token from becoming an opaque black ring. */
function svgColor(value: string | number | undefined): string {
  return typeof value === 'string' ? value : 'transparent';
}

export function HizbGauge({
  value,
  max,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  tone = 'brass',
  centerLabel,
  accessibilityLabel,
}: HizbGaugeProps) {
  const reducedMotion = useReducedMotion();
  const [borderToken, brassToken, successToken, foregroundToken] =
    useCSSVariable([
      '--color-border',
      '--color-brass',
      '--color-success',
      '--color-foreground',
    ]);
  const arcToken =
    tone === 'success'
      ? successToken
      : tone === 'white'
        ? foregroundToken
        : brassToken;

  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const target = Number.isFinite(value)
    ? Math.min(safeMax, Math.max(0, value))
    : 0;
  const ratio = target / safeMax;

  const radius = Math.max(0, (size - strokeWidth) / 2);
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reducedMotion
      ? ratio
      : withTiming(ratio, {
          duration: ARC_DURATION,
          // CSS `ease-out`, so the native ring and the web arc decelerate on
          // the same curve. Written as a bezier rather than `Easing.out` so a
          // plain test mock of Reanimated can still run the band.
          easing: Easing.bezier(0, 0, 0.58, 1),
        });
  }, [progress, ratio, reducedMotion]);

  const animatedProps = useAnimatedProps(
    () => ({
      strokeDashoffset: circumference * (1 - progress.value),
    }),
    [circumference],
  );

  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
      {...(accessibilityLabel === undefined
        ? { accessible: false }
        : {
            accessibilityRole: 'progressbar' as const,
            accessibilityValue: { min: 0, max: safeMax, now: target },
            accessibilityLabel,
          })}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={svgColor(borderToken)}
          strokeWidth={strokeWidth}
        />

        <AnimatedCircle
          animatedProps={animatedProps}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={svgColor(arcToken)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {centerLabel !== undefined ? (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-lg font-semibold text-foreground tabular-nums">
            {centerLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
