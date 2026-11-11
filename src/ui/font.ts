import { useDirection } from '@/i18n';
import type { Direction } from '@/i18n';

/**
 * The UI typeface for the current direction.
 *
 * Both directions resolve to IBM Plex Sans Arabic: it is one family that
 * carries Latin and Arabic, so the app no longer has to pick between a Latin
 * face and an Arabic face when it changes language. The tokens stay distinct
 * (`--font-ui` / `--font-arabic`) so a future Latin-only or Arabic-only face
 * can be reintroduced here without touching a component.
 *
 * The direction still has to be resolved, because React Native cannot fall
 * back: exactly one family is named at render time and the choice follows the
 * app language, not the device.
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
