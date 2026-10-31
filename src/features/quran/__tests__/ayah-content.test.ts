import type { EditionBboxes } from '@/core/types';
import { buildAyahBlocks, resolveSelectedAyah } from '../ayah-content';

/**
 * The selection's canonical identity.
 *
 * The reader store keeps an ayah-in-surah key, which is correct for drawing the
 * current page but not unique on a page that ends one surah and starts the
 * next. These cases pin the difference: the identity must come from the bbox
 * row the tap landed on.
 */

const BOX = { top: 0.1, left: 0.1, bottom: 0.2, right: 0.9 };

const BBOXES: EditionBboxes = {
  byPage: {
    // Page 2 of the mushaf: al-Fatihah's last ayah and al-Baqarah's first.
    '2': {
      '7': { absoluteNumber: 7, surahNumber: 1, bboxes: [BOX] },
      '1': { absoluteNumber: 8, surahNumber: 2, bboxes: [BOX] },
    },
    '12': {
      '1': { absoluteNumber: 100, surahNumber: 2, bboxes: [BOX] },
    },
  },
  bySurah: {},
};

describe('resolveSelectedAyah', () => {
  it('reads the surah and absolute number from the tapped row', () => {
    expect(resolveSelectedAyah(BBOXES, 2, '1')).toEqual({
      surah: 2,
      ayah: 1,
      absoluteNumber: 8,
    });
  });

  it('does not confuse the same ayah key across a surah boundary', () => {
    // `"7"` is the last ayah of al-Fatihah, not al-Baqarah's seventh.
    expect(resolveSelectedAyah(BBOXES, 2, '7')).toEqual({
      surah: 1,
      ayah: 7,
      absoluteNumber: 7,
    });
  });

  it('returns null with no selection, no page rows, or no matching row', () => {
    expect(resolveSelectedAyah(BBOXES, 2, null)).toBeNull();
    expect(resolveSelectedAyah(BBOXES, 999, '1')).toBeNull();
    expect(resolveSelectedAyah(BBOXES, 12, '255')).toBeNull();
    expect(resolveSelectedAyah(null, 2, '1')).toBeNull();
  });
});

describe('buildAyahBlocks', () => {
  it('puts the Quran text first, RTL, independent of the UI language', () => {
    expect(buildAyahBlocks({ text: 'الم' })).toEqual([
      { key: 'quran', kind: 'quran', text: 'الم', direction: 'rtl' },
    ]);
  });

  it('keeps each source block’s own direction', () => {
    const blocks = buildAyahBlocks({ text: 'الم' }, [
      {
        key: 'en',
        kind: 'translation',
        text: 'Alif, Lam, Meem.',
        direction: 'ltr',
        label: 'Translation',
      },
      {
        key: 'e3rab',
        kind: 'e3rab',
        text: 'الم: حروف مقطعة',
        direction: 'rtl',
        label: 'E3rab',
      },
    ]);

    expect(blocks.map((block) => block.direction)).toEqual([
      'rtl',
      'ltr',
      'rtl',
    ]);
    expect(blocks.map((block) => block.kind)).toEqual([
      'quran',
      'translation',
      'e3rab',
    ]);
  });
});
