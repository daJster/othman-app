/**
 * The home surface's motion budget.
 *
 * One scale for the whole page, so a reveal, a press and the card's morph read
 * as the same hand. Reanimated easings are built *inside* worklets rather than
 * exported from here: the Jest mock only exposes part of `Easing`, and a
 * module-level curve would break every test that imports the home screen.
 *
 * `reduceMs` is the reduced-motion answer to any of the larger moves: a
 * crossfade that keeps the state change legible without the travel.
 */
export const MOTION = {
  /** Press feedback on any pressable. */
  press: 120,
  /** A row arriving after the page settles. */
  reveal: 320,
  /** Delay between consecutive reveals; capped at four rows. */
  stagger: 40,
  /** Reduced motion: the same change, with no travel. */
  reduceMs: 160,
  /** The glass light pass. */
  sheen: 460,
  /** Anticipation before the card leaves the page. */
  liftIn: 100,
  /** The settle after the anticipation. */
  liftOut: 320,
  /** The pinned pill's label swap. */
  labelSwap: 200,
  /** The card's settle spring. Under critical for a small squeeze. */
  spring: { damping: 19, stiffness: 140, mass: 1 },
} as const;

/** How far a revealed row travels before it settles. */
export const REVEAL_OFFSET = 8;
