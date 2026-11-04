/**
 * The milestones on the mushaf's history page.
 *
 * The copy is deliberately narrow: no years, no dates, no names beyond the
 * Prophet Muhammad ﷺ and the caliph Uthman, no place claims, and one
 * descriptive sentence per body. `source` is a contract, not decoration: every
 * entry names a checkable work, and a milestone without one does not ship.
 */
export type HistoryMilestone = {
  id: string;
  /** Translation key for the era label. */
  eraKey: string;
  /** Translation key for the one-sentence body. */
  bodyKey: string;
  /** Human-readable attribution, shown as a caption. Never invent one. */
  source: string;
};

export const HISTORY_MILESTONES = [
  {
    id: 'revelation',
    eraKey: 'quran.history.eras.revelation',
    bodyKey: 'quran.history.bodies.revelation',
    source: 'Qurʾān 15:9',
  },
  {
    id: 'codex',
    eraKey: 'quran.history.eras.codex',
    bodyKey: 'quran.history.bodies.codex',
    source: 'al-Bukhārī, Ṣaḥīḥ',
  },
  {
    id: 'standardisation',
    eraKey: 'quran.history.eras.standardisation',
    bodyKey: 'quran.history.bodies.standardisation',
    source: 'al-Bukhārī, Ṣaḥīḥ',
  },
  {
    id: 'print',
    eraKey: 'quran.history.eras.print',
    bodyKey: 'quran.history.bodies.print',
    source: 'Encyclopaedia of the Qurʾān',
  },
] as const satisfies readonly HistoryMilestone[];
