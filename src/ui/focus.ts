/**
 * The web focus treatment.
 *
 * Uniwind compiles these classes to CSS on web and ignores them on native, so
 * one constant keeps every keyboard-reachable control visually identical
 * without branching on `Platform`. `ring` is a token, not a raw colour.
 */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
