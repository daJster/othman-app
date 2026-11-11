import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/ui/motion';
/**
 * Dust in the hero's light.
 *
 * The film already moves, so this layer's only job is depth: it makes the still
 * poster feel like air and gives the glass panel something to sit in front of.
 * That is why every mote is a 1–4 px point at 5–13% opacity, uniformly spread,
 * with a 40–90 s round trip — if you can catch a particle moving, the value is
 * wrong.
 *
 * The field is generated from a fixed seed rather than `Math.random()`. The web
 * build is a static export: server and client must lay out identical nodes on
 * the first pass or React reports a hydration mismatch and throws the tree
 * away. A seeded generator is also the only way the composition is reviewable —
 * the same points land in the same places on every load.
 */

type Mote = {
  /** Percentages of the hero box, so the field survives a resize. */
  left: number;
  top: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
  /** Pixels of vertical travel, up and back. */
  rise: number;
  /** Pixels of horizontal wander, right and back. */
  drift: number;
};

/** Deterministic PRNG (mulberry32). Small, fast, identical on every engine. */
function seeded(seed: number) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;

    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIELD: Mote[] = (() => {
  const random = seeded(0x0f7a311);
  const between = (min: number, max: number) => min + random() * (max - min);

  return Array.from({ length: 28 }, () => ({
    left: between(2, 98),
    // The top and bottom tenths stay clear: the first sits under the
    // nav hairline, the last under the call to action.
    top: between(9, 91),
    size: between(1.4, 3.8),
    opacity: between(0.1, 0.22),
    delay: between(0, 6000),
    duration: between(42000, 92000),
    rise: between(12, 32),
    drift: between(-7, 7),
  }));
})();

export type HeroParticlesProps = {
  /** How many motes to draw. Phones get fewer than desktops. */
  count: number;
};

export function HeroParticles({ count }: HeroParticlesProps) {
  const still = useReducedMotion();

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {FIELD.slice(0, count).map((mote, index) => (
        <MoteView key={index} mote={mote} still={still} />
      ))}
    </View>
  );
}

function MoteView({ mote, still }: { mote: Mote; still: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (still) {
      progress.value = 0;

      return;
    }

    progress.value = withDelay(
      mote.delay,
      withRepeat(
        withTiming(1, {
          duration: mote.duration,
          easing: Easing.linear,
        }),
        -1,
        true,
      ),
    );
  }, [mote, progress, still]);

  const animation = useAnimatedStyle(() => {
    if (still) {
      return { opacity: mote.opacity };
    }

    return {
      opacity: interpolate(
        progress.value,
        [0, 0.06, 0.94, 1],
        [0, mote.opacity, mote.opacity, 0],
      ),
      transform: [
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [mote.rise, -mote.rise],
          ),
        },
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [mote.drift, -mote.drift],
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${mote.left}%`,
          top: `${mote.top}%`,
          width: mote.size,
          height: mote.size,
        },
        animation,
      ]}
    >
      {/*
       * The colour lives on a child: Uniwind resolves `className` for the
       * components it wraps, and `Animated.View` is not one of them.
       */}
      <View className="h-full w-full rounded-full bg-parchment" />
    </Animated.View>
  );
}
