import { useFonts } from 'expo-font';

/**
 * Font files, keyed by the family name the app refers to.
 *
 * Keys are **file basenames** and must stay identical to the `--font-*` values
 * in `src/global.css` (`--font-ui`, `--font-arabic`, `--font-quran`). That is
 * the whole contract: a renamed file breaks `font-ui` at render time, and there
 * is no fallback list to hide it, so the match is deliberate rather than
 * convenient.
 *
 * Families:
 *  - Inter — Latin UI text (numbers, English strings, inline code).
 *  - Noto Naskh Arabic — Arabic UI text. Naskh is the readable, non-Quranic
 *    style; it is what the reader's chrome and the rest of the interface use.
 *  - Amiri Quran — the mushaf itself. Only the page renders with it.
 *
 * All three are SIL Open Font License. `expo-font`'s config plugin embeds them
 * in native builds; `useAppFonts` covers web and gives the splash gate
 * something to wait on.
 */
export const FONT_SOURCES = {
  'Inter-Variable': require('../../assets/fonts/Inter-Variable.ttf'),
  'NotoNaskhArabic-Variable': require('../../assets/fonts/NotoNaskhArabic-Variable.ttf'),
  'AmiriQuran-Regular': require('../../assets/fonts/AmiriQuran-Regular.ttf'),
} as const;

export function useAppFonts(): readonly [boolean, Error | null] {
  return useFonts(FONT_SOURCES);
}
