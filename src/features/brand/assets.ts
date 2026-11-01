/**
 * Brand assets, resolved by the surface they sit on rather than by theme name.
 *
 * The source files in `othman-web/public` use inconsistent naming: the
 * wordmark's `-dark` file is *white ink for a dark surface*, while the reader
 * logo's `-dark` file is *black ink for a light surface*. These maps name the
 * surface, not the file, so a caller cannot pick the invisible variant by
 * accident.
 */
export type BrandSurface = 'onLight' | 'onDark';

export const WORDMARK = {
  onLight: require('../../../assets/brand/othman-light.png'),
  onDark: require('../../../assets/brand/othman-dark.png'),
} as const;

export const READER_LOGO = {
  onLight: require('../../../assets/brand/quranReaderLandingLogo-dark.png'),
  onDark: require('../../../assets/brand/quranReaderLandingLogo-light.png'),
} as const;

export const AYAH_ORNAMENT = {
  onLight: require('../../../assets/brand/ayah_icon-dark.svg'),
  onDark: require('../../../assets/brand/ayah_icon-light.svg'),
} as const;

export const REVELATION_MARK = {
  madina: {
    onLight: require('../../../assets/brand/madina-dark.svg'),
    onDark: require('../../../assets/brand/madina-light.svg'),
  },
  makka: {
    onLight: require('../../../assets/brand/makka-dark.svg'),
    onDark: require('../../../assets/brand/makka-light.svg'),
  },
} as const;

/** Four-colour Google mark. One asset, theme-independent. */
export const GOOGLE_MARK = require('../../../assets/brand/google.svg');

/** Aspect ratio of the wordmark artwork (664 × 375). */
export const WORDMARK_ASPECT = 664 / 375;
