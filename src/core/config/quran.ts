/**
 * Per-edition page geometry for the mushaf viewer.
 *
 * Each scanned page needs its own scale/offset to sit correctly in the reader
 * frame, plus a `default` entry for the pages nobody hand-tuned. The source
 * data exposed this through `createQuranPageScaleConfig()`, which two
 * components each called during render; the accessors below replace both call
 * sites and centralise the `default` fallback rule.
 */

import { defineConfig, defineTable } from './primitives';

export type PageSize = {
  readonly height: number;
  readonly width: number;
};

export type PageScale = {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetX: number;
  readonly offsetY: number;
};

export type EditionPageConfig = {
  readonly size: PageSize;
  readonly pages: Readonly<Record<string, PageScale>>;
};

/** Page key that supplies the fallback transform for an edition. */
export const DEFAULT_PAGE_KEY = 'default';

const editionRows = {
  Tajweed: {
    size: { height: 600, width: 412 },
    pages: {
      '1': { scaleX: 0.9, scaleY: 0.88, offsetX: -5, offsetY: -20 },
      '2': { scaleX: 0.9, scaleY: 0.88, offsetX: -5, offsetY: -20 },
      default: { scaleX: 0.85, scaleY: 0.897, offsetX: -5, offsetY: 0 },
    },
  },
  MedinaOld: {
    size: { height: 600, width: 412 },
    pages: {
      '4': { scaleX: 0.95, scaleY: 0.92, offsetX: -10, offsetY: -8 },
      '5': { scaleX: 0.95, scaleY: 0.92, offsetX: -18, offsetY: -8 },
      default: { scaleX: 0.93, scaleY: 0.9, offsetX: -8, offsetY: -2 },
    },
  },
  Warsh1: {
    size: { height: 600, width: 412 },
    pages: {
      '4': { scaleX: 0.9, scaleY: 0.85, offsetX: -3, offsetY: 16 },
      '5': { scaleX: 0.83, scaleY: 0.858, offsetX: 10, offsetY: 16 },
      default: { scaleX: 0.865, scaleY: 0.89, offsetX: -2, offsetY: 2 },
    },
  },
} satisfies Record<string, EditionPageConfig>;

/** Every edition this build ships geometry for, derived from the data. */
export type QuranEditionId = keyof typeof editionRows;

// Annotated (not just `satisfies`) so the nested `pages` maps widen to
// `Record<string, PageScale>`; the literal keys above stay literal.
export const QURAN_PAGE_SCALE_CONFIG = defineTable(
  editionRows as Record<QuranEditionId, EditionPageConfig>,
);

export const QURAN_EDITIONS = defineConfig<readonly QuranEditionId[]>(
  QURAN_PAGE_SCALE_CONFIG.ids,
);

/** Frame size for an edition, or `undefined` when the edition is unknown. */
export function getEditionPageSize(
  edition?: string | null,
): PageSize | undefined {
  return QURAN_PAGE_SCALE_CONFIG.find(edition ?? '')?.size;
}

/**
 * Transform for one page, falling back to the edition's `default` entry.
 *
 * Page numbers arrive as either a 1-based `number` (page turn counter) or a
 * `string` key (deep link), so both are accepted.
 */
export function getEditionPageScale(
  edition: string | null | undefined,
  page: number | string,
): PageScale | undefined {
  const config = QURAN_PAGE_SCALE_CONFIG.find(edition ?? '');
  if (!config) return undefined;

  return config.pages[String(page)] ?? config.pages[DEFAULT_PAGE_KEY];
}
