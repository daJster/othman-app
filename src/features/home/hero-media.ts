/**
 * The landing film.
 *
 * Two encodes, one per composition: a 16:9 wide take for the desktop split and
 * a 9:16 tall take for the phone. The hero picks by viewport *shape*, never by
 * user agent, so a tablet in landscape gets the wide cut.
 *
 * The wired pair is the 420p encodes (`hero-wide.mp4`, `hero-tall.mp4`,
 * ~30 MB each): behind the scrim, the glass and the panel the extra pixels of
 * the 720p mezzanine (`landing-page-video-720p-*`, kept in `assets/hero/` as
 * the re-encode source) buy nothing on a hero. Metro bundles only what is
 * `require`d below, so the mezzanine costs repo weight, never app weight. If
 * the weight ever has to go further, re-encode to the README spec
 * (2–3 Mbps) and swap these two files — nothing else changes.
 *
 * Posters are frame-one PNGs (`poster-wide.png`, `poster-tall.png`): the
 * instant-paint layer under the player, and the whole hero when the film is
 * skipped for reduced motion, data saving or a failed autoplay.
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
      poster: require('../../../assets/hero/poster-wide.png'),
    },
    tall: {
      video: require('../../../assets/hero/hero-tall.mp4'),
      poster: require('../../../assets/hero/poster-tall.png'),
    },
  };
}
