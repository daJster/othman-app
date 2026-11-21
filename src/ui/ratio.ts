import { Platform } from 'react-native';

/**
 * The ratio scale.
 *
 * One module (4 px) is multiplied into every length the layout needs. The
 * tokens themselves live in `src/global.css` (`--spacing-gutter`, `--spacing-
 * control`, `--radius-card`, …); this module is the JS-side half, for the
 * places React Native needs a number rather than a class (`measureInWindow`,
 * animated geometry, a sheet's width).
 *
 * Rules of thumb:
 *
 *  - A class beats a number: `p-gutter`, `gap-section`, `rounded-card`.
 *  - A number is always `MODULE * multiplier`, never a literal, so the whole
 *    interface rescales by changing one constant.
 *  - Ratios express relationships, not sizes: the hero is a share of the
 *    viewport (web) or a fixed aspect (native), the pill is a multiple of the
 *    control floor, and the reading measure is a character count, not a pixel
 *    width.
 */
export const MODULE = 4;

/** The page gutter: 4u on a phone, 5u from `sm` up. */
export const GUTTER_CLASS = 'px-gutter sm:px-gutter-lg';
/** The same gutter as a number, for measured overlays. */
export const GUTTER = MODULE * 4;
export const GUTTER_WIDE = MODULE * 5;

/** 44 pt / 48 dp control floor, expressed as classes. */
export const CONTROL_CLASS = 'min-h-control';
export const CONTROL_LG_CLASS = 'min-h-control-lg';

/** Hairline: the one length that stays a single device pixel. */
export const HAIRLINE_CLASS = 'h-px';

/** Reading measure: ~65 characters at body size. */
export const MEASURE_CLASS = 'max-w-xl';

/** The widest page column (the web bar shares it). */
export const WIDE_CLASS = 'max-w-6xl';

/**
 * The hero's first-viewport share.
 *
 * 70% of the screen, both platforms: enough for the footage and the verse panel
 * to read as a window, and little enough that the reading sections begin on the
 * same screen — which is what a laptop layout needs.
 *
 * The web measures the small viewport (`svh`), so a collapsing mobile toolbar
 * cannot push the panel below the fold. Native has no viewport unit in the style
 * system, so `Hero` reads the window height and applies the same 70% inline.
 */
export const HERO_BOX_CLASS = Platform.OS === 'web' ? 'h-[70svh]' : '';

/**
 * Dot-grid density over the film, 0–100.
 *
 * 0 is almost no pattern (wide spacing, hairline dots); 100 is a tight
 * halftone. The grid is decoration on top of the film, not a texture that
 * competes with it, so the default sits low.
 */
export const HERO_DOT_SCALE = 35;

/** Pinned-card geometry, in modules. */
export const PIN_GAP = MODULE * 3; /* 12 */
export const PILL_HEIGHT = MODULE * 14; /* 56 */
export const PILL_MAX_WIDTH = MODULE * 85; /* 340 */
export const PILL_GUTTER = MODULE * 4; /* 16 */

/** The radius every card and the pinned pill share. */
export const CARD_RADIUS = MODULE * 6; /* 24 */

/**
 * The space the floating web bar occupies at the top of the viewport.
 *
 * Every screen clears it through the tab slot; Home cancels that inset so its
 * film can run under the glass, and the pinned hero card uses it again as its
 * own pin line so it parks *below* the bar instead of behind it.
 */
export const NAV_INSET = MODULE * 16; /* 64 */
