import type { SurahProgressBand } from '@/core/domain/progress/surah-progress';
import type { BadgeVariant } from '@/ui/badge';

/**
 * How a band is labelled and coloured.
 *
 * A literal map, not a template string: `t()` is typed against the locale, so
 * `progress.band.${band}` would type-check as any string and fail at runtime.
 * `satisfies` keeps the map exhaustive over the union.
 *
 * The tones reuse the meeting status vocabulary (`positive` = done, `info` =
 * in progress, `outline` = untouched) so a green badge means the same thing on
 * every screen.
 */
const BAND_LABEL_KEYS = {
  'not-started': 'pages.account.progress.band.notStarted',
  'in-progress': 'pages.account.progress.band.inProgress',
  memorised: 'pages.account.progress.band.memorised',
} as const satisfies Record<SurahProgressBand, string>;

const BAND_BADGE_VARIANTS = {
  'not-started': 'outline',
  'in-progress': 'info',
  memorised: 'positive',
} as const satisfies Record<SurahProgressBand, BadgeVariant>;

/** Literal key type, so `t()` can check it against the locale. */
export type BandLabelKey = (typeof BAND_LABEL_KEYS)[SurahProgressBand];

export function bandLabelKey(band: SurahProgressBand): BandLabelKey {
  return BAND_LABEL_KEYS[band];
}

export function bandBadgeVariant(band: SurahProgressBand): BadgeVariant {
  return BAND_BADGE_VARIANTS[band];
}
