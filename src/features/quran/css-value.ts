/**
 * A `string | number | undefined` CSS variable as a number.
 *
 * `useCSSVariable` returns `"260"` on web and `260` on native for the values in
 * `@theme static`, and `undefined` when the stylesheet has not been loaded
 * (Jest, or before boot). Every reader caller wants a number and has a sane
 * fallback, so the coercion lives here instead of being repeated per component.
 */
export function cssNumber(
  value: string | number | undefined,
  fallback: number,
): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}
