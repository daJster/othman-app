import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * The film's treatment: a faint blur, then a soft dot grid.
 *
 * Layered deliberately, and explicitly rather than by document order:
 *
 * ```
 * navbar            z-20   (chrome, always on top)
 * hero card         z-10   (the morph overlay)
 * dots              z-2    ← here
 * blur              z-1    ← here
 * video / poster     z-0
 * ```
 *
 * `zIndex` is written out because the layers sit inside the hero panel, whose
 * children are absolutely positioned — with `position: absolute` and no
 * `z-index`, paint order is whatever the tree happens to be, and that is how a
 * treatment ends up hidden behind a `<video>`.
 *
 * One number, `scale` 0–100, sets both the pitch and the dot size, so the
 * pattern reads as a halftone instead of noise.
 *
 * The grid is SVG rather than a CSS background-image: one implementation runs
 * on the web and on a phone, and a `<Pattern>` tiles without a DOM. Each dot is
 * a **radial gradient**, not a hard circle: the same soft falloff on both
 * platforms, where a CSS `filter: blur()` would only exist on the web. The
 * halo is what makes the grain sit in the footage instead of on top of it.
 * The black gradient below is the mask; the backdrop blur is web-only, and
 * native gets a veil faint enough to be honest about not being a blur.
 */
export type HeroFilmTreatmentProps = {
  /** Dot density, 0–100. */
  scale?: number;
  /** Opacity of the whole dot grid. */
  opacity?: number;
};

const DOT_ID = 'hero-film-dots';
const DOT_GRADIENT_ID = 'hero-film-dot-soft';

function dotMetrics(scale: number) {
  const t = Math.min(Math.max(scale, 0), 100) / 100;

  // 28px → 9px of pitch, and a 0.3px → 0.9px dot: the grid is a grain over the
  // footage, not a screen of its own, so the dots stay under a pixel at the
  // low end and never reach two. The painted circle is wider than that core,
  // because most of its width is the gradient's fading edge.
  return { pitch: 28 - 19 * t, radius: 0.3 + 0.6 * t };
}

export function HeroFilmTreatment({
  scale = 45,
  opacity = 0.4,
}: HeroFilmTreatmentProps) {
  const { pitch, radius } = dotMetrics(scale);

  return (
    <>
      {/*
       * The mask is a black gradient rather than a blur: it darkens the film
       * from the top edge down to nothing, which is what separates the footage
       * from the bar and gives the dots something to read against. One
       * implementation on both platforms — the gradient is the same everywhere,
       * unlike `backdrop-filter`.
       */}
      <LinearGradient
        testID="hero-film-mask"
        colors={[
          'rgba(0, 0, 0, 0.62)',
          'rgba(0, 0, 0, 0.18)',
          'rgba(0, 0, 0, 0)',
        ]}
        locations={[0, 0.35, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
        pointerEvents="none"
      />

      <View
        testID="hero-film-dots"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { zIndex: 2, opacity }]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            {/*
             * A soft dot: opaque core, then a long transparent tail. Three
             * stops is the cheapest curve that reads as a blur rather than as
             * a vignette; the `stopOpacity` does the work, so the colour never
             * has to change between centres and edges.
             */}
            <RadialGradient id={DOT_GRADIENT_ID}>
              <Stop offset="0" stopColor="#9a9a9a" stopOpacity="1" />
              <Stop offset="0.45" stopColor="#9a9a9a" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#9a9a9a" stopOpacity="0" />
            </RadialGradient>

            <Pattern
              id={DOT_ID}
              width={pitch}
              height={pitch}
              patternUnits="userSpaceOnUse"
            >
              <Circle
                cx={pitch / 2}
                cy={pitch / 2}
                // Wider than the core: the halo is what the gradient fades
                // through, and what makes the pupil read as out of focus.
                r={radius * 2.6}
                fill={`url(#${DOT_GRADIENT_ID})`}
              />
            </Pattern>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#${DOT_ID})`}
          />
        </Svg>
      </View>
    </>
  );
}
