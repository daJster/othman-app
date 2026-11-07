/**
 * The landing film.
 *
 * Two H.264 MP4s, one per composition (`hero-tall.mp4`, `hero-wide.mp4`,
 * ~1.3 MB together): H.264 plays on iOS (AVPlayer), Android (ExoPlayer) and
 * every browser, so both slots share the same files on all platforms — no
 * platform branches, no fallbacks. The hero picks tall or wide by viewport
 * shape, never by user agent.
 *
 * Posters are frame-one JPEGs: the instant-paint layer under the player, and
 * the whole hero when the film is skipped for reduced motion, data saving or
 * a failed autoplay. Each poster matches its own encode so the first-frame
 * swap stays invisible.
 */

export type HeroFilmSource = {
  /** Bundled encode. H.264, muted, seamless loop, grade baked in. */
  video: number;
  /** Frame one of the same encode, graded to match. */
  poster: number;
};

export type HeroFilmSet = {
  wide: HeroFilmSource;
  tall: HeroFilmSource;
};

/**
 * A function rather than a const so the empty case stays a plain runtime
 * branch: a module-level `const … = null` is narrowed to `null` at every use
 * site, and the video path would typecheck as unreachable code.
 */
export function getHeroFilm(): HeroFilmSet | null {
  return {
    wide: {
      video: require('../../../assets/hero/hero-wide.mp4'),
      poster: require('../../../assets/hero/poster-wide.jpeg'),
    },
    tall: {
      video: require('../../../assets/hero/hero-tall.mp4'),
      poster: require('../../../assets/hero/poster-tall.jpeg'),
    },
  };
}
