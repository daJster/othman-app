import type { AyahContent, PageAyahBboxes } from '@/core/types';

/**
 * The selected ayah's canonical identity.
 *
 * `ayahKey` in the reader store is an *ayah-in-surah* key (`"255"`), which
 * repeats on a page that crosses a surah boundary — page 2 of the mushaf ends
 * al-Fatihah and starts al-Baqarah, so both can be `"1"`. Fetching content from
 * that key alone would request surah 1's ayah 1 for a tap on surah 2's ayah 1.
 *
 * `resolveSelectedAyah` reads the bbox row back out of the attached page table
 * instead, because that row is what the tap actually landed on and it carries
 * the absolute number (1–6236) plus the surah the ayah belongs to. The result is
 * the identity every later content package (text, tafsir, notes, audio) keys on.
 */
export type SelectedAyah = {
  surah: number;
  /** Ayah-in-surah, 1–286. */
  ayah: number;
  /** Absolute ayah, 1–6236 — the only globally unique key. */
  absoluteNumber: number;
};

/**
 * @param bboxes  The attached edition's tables, or `null` before boot.
 * @param page    The current page.
 * @param ayahKey The store's ayah-in-surah key, or `null` when nothing is
 *                selected.
 *
 * Returns `null` when there is no row for the key: a stale selection from a
 * previous page must not resolve to an unrelated ayah, and a missing row is
 * better treated as "nothing selected" than as an error.
 */
export function resolveSelectedAyah(
  bboxes: { byPage: Record<string, Record<string, PageAyahBboxes>> } | null,
  page: number,
  ayahKey: string | null,
): SelectedAyah | null {
  if (!bboxes || ayahKey === null) return null;

  const row = bboxes.byPage[String(page)]?.[ayahKey];
  if (!row) return null;

  return {
    surah: row.surahNumber,
    ayah: Number(ayahKey),
    absoluteNumber: row.absoluteNumber,
  };
}

/** A source block: a translation or an e3rab excerpt, with its own direction. */
export type AyahSourceBlock = {
  /** Stable React key, usually the source id. */
  key: string;
  kind: 'translation' | 'e3rab';
  text: string;
  /**
   * Direction of *this block's* script. A translation into English is LTR even
   * inside an RTL reader, and an Arabic e3rab excerpt is RTL inside an LTR one.
   */
  direction: 'rtl' | 'ltr';
  label?: string;
};

export type AyahContentBlock = {
  key: string;
  kind: 'quran' | AyahSourceBlock['kind'];
  text: string;
  direction: 'rtl' | 'ltr';
  label?: string;
};

/**
 * Build the block list for the content panel.
 *
 * The Quran text always comes first and is always RTL — it is Arabic scripture,
 * not UI copy, so it does not follow the interface language. Sources keep the
 * direction they were declared with; nothing here reads the app's direction,
 * which is what keeps an LTR translation from being flipped by an Arabic UI.
 */
export function buildAyahBlocks(
  content: Pick<AyahContent, 'text'>,
  sources: readonly AyahSourceBlock[] = [],
): AyahContentBlock[] {
  return [
    { key: 'quran', kind: 'quran', text: content.text, direction: 'rtl' },
    ...sources.map((source) => ({
      key: source.key,
      kind: source.kind,
      text: source.text,
      direction: source.direction,
      label: source.label,
    })),
  ];
}
