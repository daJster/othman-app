/**
 * The landing film.
 *
 * One H.264 MP4 (`hero-wide.mp4`): H.264 plays on iOS (AVPlayer), Android
 * (ExoPlayer) and every browser, so a single encode serves the phone, the
 * tablet and the web. The hero cover-crops it, so a portrait phone sees the
 * centre of the same push — there is no second file to download and no source
 * swap when the window changes shape.
 *
 * The poster is frame one of the same encode: the instant-paint layer under
 * the player, and the whole hero when playback fails.
 */

export type HeroFilmSource = {
  /** Bundled encode. H.264, muted, seamless loop, grade baked in. */
  video: number;
  /** Frame one of the same encode, graded to match. */
  poster: number;
};

/**
 * A function rather than a const so the empty case stays a plain runtime
 * branch: a module-level `const … = null` is narrowed to `null` at every use
 * site, and the video path would typecheck as unreachable code.
 */
export function getHeroFilm(): HeroFilmSource | null {
  return {
    video: require('../../../assets/hero/hero-wide.mp4'),
    poster: require('../../../assets/hero/poster-wide.jpeg'),
  };
}
