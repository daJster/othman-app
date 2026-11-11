import { useFonts, type FontFamilyDefinition } from 'expo-font';

/**
 * Font files, grouped into the families the app refers to.
 *
 * Keys are **family names** and must stay identical to the `--font-*` values
 * in `src/global.css` (`--font-ui`, `--font-arabic`, `--font-quran`). That is
 * the whole contract: a renamed family breaks `font-ui` at render time, and
 * there is no fallback list to hide it, so the match is deliberate rather than
 * convenient.
 *
 * Families:
 *  - IBM Plex Sans Arabic — every piece of interface text, Latin *and*
 *    Arabic. It is one family with two scripts in it, which is what lets the
 *    app stop choosing a typeface by language (`src/ui/font.ts`).
 *  - Amiri Quran — the mushaf itself. Only Quranic runs render with it.
 *
 * Both are SIL Open Font License. `expo-font`'s config plugin embeds them in
 * native builds; `useAppFonts` covers web and gives the splash gate something
 * to wait on.
 *
 * **Why the array form.** IBM Plex Sans Arabic ships as four *static* files,
 * so the map form (`{ Name: require(...) }`) would register only one file per
 * name: Android and the browser would fake the bold, and iOS ignores
 * `fontWeight` on a named custom family altogether — `font-bold` would quietly
 * render Regular. Declaring the faces under one family gives every platform a
 * real 400/500/600/700 to select from, so the weight utilities the whole
 * interface already uses keep working untouched.
 *
 * Known limit: on Android below API 29 `expo-font` loads only the family's
 * default face, so those devices render Regular at every weight. That is a
 * degradation, not a bug — the alternative (one family per weight) cannot be
 * expressed as a CSS token and would push weight handling into every caller.
 */
export const UI_FONT_FAMILY = 'IBMPlexSansArabic';
export const QURAN_FONT_FAMILY = 'AmiriQuran-Regular';

export const FONT_FAMILIES: FontFamilyDefinition[] = [
  {
    fontFamily: UI_FONT_FAMILY,
    fontDefinitions: [
      {
        path: require('../../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
        weight: 400,
      },
      {
        path: require('../../assets/fonts/IBMPlexSansArabic-Medium.ttf'),
        weight: 500,
      },
      {
        path: require('../../assets/fonts/IBMPlexSansArabic-SemiBold.ttf'),
        weight: 600,
      },
      {
        path: require('../../assets/fonts/IBMPlexSansArabic-Bold.ttf'),
        weight: 700,
      },
    ],
  },
  {
    fontFamily: QURAN_FONT_FAMILY,
    fontDefinitions: [
      { path: require('../../assets/fonts/AmiriQuran-Regular.ttf') },
    ],
  },
];

export function useAppFonts(): readonly [boolean, Error | null] {
  return useFonts(FONT_FAMILIES);
}
