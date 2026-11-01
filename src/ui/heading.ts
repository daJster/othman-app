/**
 * Heading semantics.
 *
 * React Native maps `role="heading"` on web, but RNW does not infer a level;
 * `aria-level` has to travel as a cast prop because RN's types do not declare
 * it yet. One helper keeps every page title, section title and state title
 * using the same pair.
 */
export type HeadingLevel = 1 | 2;

export const HEADING_ROLE = {
  accessibilityRole: 'header',
  role: 'heading',
} as const;

export function headingAriaLevel(level: HeadingLevel) {
  return { 'aria-level': level } as Record<string, unknown>;
}
