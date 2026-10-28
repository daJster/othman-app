import { useDirection } from '@/i18n';
import type { Direction } from '@/i18n';

/**
 * The UI typeface for the current direction.
 *
 * Arabic and Latin UI text use different files — Noto Naskh is legible at body
 * size where a Latin face's Arabic glyphs are not, and Inter is the wrong shape
 * for Latin prose in an otherwise Arabic UI. React Native cannot fall back, so
 * exactly one family is named at render time and the choice follows the app
 * language, not the device.
 *
 * The values are complete literals in a static map: Tailwind scans source text,
 * so a value built with interpolation would compile to nothing.
 */
const UI_FONT_BY_DIRECTION: Readonly<Record<Direction, string>> = {
  rtl: 'font-arabic',
  ltr: 'font-ui',
};

export function useUiFontClass(): string {
  const { direction } = useDirection();
  return UI_FONT_BY_DIRECTION[direction];
}
