import type { DateKey } from '../../types';

/**
 * Per-surah memorisation progress.
 *
 * The unit is a surah because the overview is a 114-cell heatmap: one cell per
 * surah, coloured by how much of it is memorised. Ayah-level detail (which ayat,
 * which page) belongs to the reader and to the backend — a percentage is what
 * the heatmap needs and all this screen claims to know.
 *
 * `percent` is already rounded and clamped by whoever produced the row. Keeping
 * the value canonical (0–100) is what stops a malformed backend row from
 * producing a colour outside the heatmap ramp or a bar wider than its track.
 */

export type SurahProgressBand = 'not-started' | 'in-progress' | 'memorised';

export type SurahProgress = {
  /** 1–114, matching the mushaf's ordering. */
  surahNumber: number;
  /** Integer 0–100. */
  percent: number;
  /** When the surah was last revised, or `null` if it was never started. */
  lastReviewed: DateKey | null;
};

export type ProgressSummary = {
  /** Mean of every row, rounded. */
  averagePercent: number;
  /** Surahs at 100%. */
  memorised: number;
  /** Surahs above 0%, including the completed ones. */
  started: number;
  /** Rows counted, so the UI can print "12 of 114" without assuming. */
  total: number;
};

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function bandOf(percent: number): SurahProgressBand {
  if (percent <= 0) return 'not-started';
  if (percent >= 100) return 'memorised';

  return 'in-progress';
}

/**
 * Headline numbers for the summary card.
 *
 * Every surah counts equally in the average: the screen is a surah-level
 * overview, so weighting by ayah count would mean carrying a 114-entry ayah
 * table just to compute one number. An empty list summarizes to zeroes rather
 * than dividing by zero.
 */
export function summarizeProgress(
  rows: readonly SurahProgress[],
): ProgressSummary {
  const total = rows.length;
  if (total === 0) {
    return { averagePercent: 0, memorised: 0, started: 0, total: 0 };
  }

  let sum = 0;
  let memorised = 0;
  let started = 0;

  for (const row of rows) {
    sum += row.percent;
    if (row.percent >= 100) memorised += 1;
    if (row.percent > 0) started += 1;
  }

  return {
    averagePercent: Math.round(sum / total),
    memorised,
    started,
    total,
  };
}
