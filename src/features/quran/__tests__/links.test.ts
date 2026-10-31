import type { EditionBboxes, QuranEdition } from '@/core/types';
import {
  buildQuranAppLink,
  buildQuranShareUrl,
  buildQuranWebPath,
  parseQuranLink,
  resolveQuranLink,
} from '../links';

/**
 * Link shapes.
 *
 * The same three parameters have to survive a round trip through the native
 * scheme, the web path and the share URL, and every malformed shape has to be
 * rejected rather than coerced. The resolver cases pin the precedence rule:
 * a surah/ayah link wins over a contradictory page, and an unknown ayah is a
 * recoverable error, not page 1.
 */

const BOX = { top: 0.1, left: 0.1, bottom: 0.2, right: 0.9 };

const BBOXES: EditionBboxes = {
  byPage: {},
  bySurah: {
    '1': {
      '1': { absoluteNumber: 1, pageNumber: 1, bboxes: [BOX] },
      '7': { absoluteNumber: 7, pageNumber: 2, bboxes: [BOX] },
    },
    '2': {
      '1': { absoluteNumber: 8, pageNumber: 2, bboxes: [BOX] },
      '255': { absoluteNumber: 262, pageNumber: 42, bboxes: [BOX] },
    },
    '114': {
      '1': { absoluteNumber: 6231, pageNumber: 604, bboxes: [BOX] },
    },
  },
};

const STANDARD: QuranEdition = {
  key: '1',
  name: 'Tajweed',
  riwaya: 'hafs',
  baseUrl: 'https://cdn.test/1',
  bboxUrl: 'https://cdn.test/1/bbox.json',
  bboxReversedUrl: 'https://cdn.test/1/bbox_reversed.json',
  bboxNormUrl: 'https://cdn.test/1/bbox_norm.json',
  bboxReversedNormUrl: 'https://cdn.test/1/bbox_reversed_norm.json',
  firstPage: 1,
  lastPage: 604,
  themeColor: '#FFFFD7',
};

describe('parseQuranLink', () => {
  it('treats no parameters as a plain entry', () => {
    expect(parseQuranLink({})).toEqual({ kind: 'empty' });
  });

  it('parses each accepted shape', () => {
    expect(parseQuranLink({ page: '12' })).toEqual({
      kind: 'link',
      page: 12,
      surah: null,
      ayah: null,
    });
    expect(parseQuranLink({ surah: '2' })).toEqual({
      kind: 'link',
      page: null,
      surah: 2,
      ayah: null,
    });
    expect(parseQuranLink({ page: '42', surah: '2', ayah: '255' })).toEqual({
      kind: 'link',
      page: 42,
      surah: 2,
      ayah: 255,
    });
  });

  it('keeps a zero page for the resolver to clamp', () => {
    expect(parseQuranLink({ page: '0' })).toMatchObject({
      kind: 'link',
      page: 0,
    });
  });

  it('rejects duplicated parameters', () => {
    expect(parseQuranLink({ page: ['1', '2'] })).toEqual({
      kind: 'invalid',
      param: 'page',
      reason: 'duplicate',
    });
    expect(parseQuranLink({ surah: ['2', '2'] })).toEqual({
      kind: 'invalid',
      param: 'surah',
      reason: 'duplicate',
    });
  });

  it('rejects malformed numbers instead of coercing them', () => {
    for (const page of ['abc', '1.5', '-1', '', ' ']) {
      expect(parseQuranLink({ page })).toEqual({
        kind: 'invalid',
        param: 'page',
        reason: 'malformed',
      });
    }

    expect(parseQuranLink({ surah: '115' })).toEqual({
      kind: 'invalid',
      param: 'surah',
      reason: 'malformed',
    });
    expect(parseQuranLink({ surah: '2', ayah: '287' })).toEqual({
      kind: 'invalid',
      param: 'ayah',
      reason: 'malformed',
    });
  });

  it('rejects an ayah without the surah it belongs to', () => {
    expect(parseQuranLink({ ayah: '255' })).toEqual({
      kind: 'invalid',
      param: 'ayah',
      reason: 'conflict',
    });
  });
});

describe('builders', () => {
  it('round-trips a page link through the web path', () => {
    const path = buildQuranWebPath({ page: 42, surah: null, ayah: null });

    expect(path).toBe('/quran?page=42');
    expect(
      parseQuranLink(Object.fromEntries(new URLSearchParams('page=42'))),
    ).toEqual({
      kind: 'link',
      page: 42,
      surah: null,
      ayah: null,
    });
  });

  it('round-trips an ayah link through the native scheme', () => {
    const link = buildQuranAppLink({ page: 42, surah: 2, ayah: 255 });

    expect(link).toBe('othman://quran?page=42&surah=2&ayah=255');

    const query = Object.fromEntries(new URLSearchParams(link.split('?')[1]));

    expect(parseQuranLink(query)).toEqual({
      kind: 'link',
      page: 42,
      surah: 2,
      ayah: 255,
    });
  });

  it('builds the share URL from the same query', () => {
    expect(buildQuranShareUrl({ page: null, surah: 2, ayah: 255 })).toMatch(
      /\/quran\?surah=2&ayah=255$/,
    );
  });

  it('refuses to build a link the parser would reject', () => {
    expect(() =>
      buildQuranWebPath({ page: -1, surah: null, ayah: null }),
    ).toThrow(RangeError);
    expect(() =>
      buildQuranWebPath({ page: null, surah: 115, ayah: null }),
    ).toThrow(RangeError);
    expect(() =>
      buildQuranWebPath({ page: null, surah: null, ayah: 2 }),
    ).toThrow(RangeError);
  });
});

describe('resolveQuranLink', () => {
  it('lets the ayah mapping win over a contradictory page', () => {
    expect(
      resolveQuranLink({ page: 1, surah: 2, ayah: 255 }, STANDARD, BBOXES),
    ).toEqual({ kind: 'ayah', surah: 2, ayah: 255, page: 42 });
  });

  it('defaults a surah link to its first ayah', () => {
    expect(
      resolveQuranLink(
        { page: null, surah: 114, ayah: null },
        STANDARD,
        BBOXES,
      ),
    ).toEqual({ kind: 'ayah', surah: 114, ayah: 1, page: 604 });
  });

  it('clamps page-only links into the edition, including nonstandard ranges', () => {
    expect(
      resolveQuranLink(
        { page: 9999, surah: null, ayah: null },
        STANDARD,
        BBOXES,
      ),
    ).toEqual({ kind: 'page', page: 604 });
    expect(
      resolveQuranLink({ page: 0, surah: null, ayah: null }, STANDARD, BBOXES),
    ).toEqual({ kind: 'page', page: 1 });

    const warsh = { firstPage: 4, lastPage: 605 };

    expect(
      resolveQuranLink({ page: 1, surah: null, ayah: null }, warsh, BBOXES),
    ).toEqual({ kind: 'page', page: 4 });
    expect(
      resolveQuranLink({ page: 999, surah: 114, ayah: 1 }, warsh, BBOXES),
    ).toEqual({ kind: 'ayah', surah: 114, ayah: 1, page: 604 });
  });

  it('reports an unknown ayah as recoverable instead of page 1', () => {
    expect(
      resolveQuranLink({ page: 1, surah: 1, ayah: 99 }, STANDARD, BBOXES),
    ).toEqual({ kind: 'invalid', param: 'ayah' });
    expect(
      resolveQuranLink({ page: 1, surah: 60, ayah: 1 }, STANDARD, BBOXES),
    ).toEqual({ kind: 'invalid', param: 'ayah' });
  });
});
