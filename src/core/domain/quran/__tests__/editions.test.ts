import {
  requireEdition,
  resolveEditionKey,
} from '@/core/domain/quran/editions';
import { QuranDataError } from '@/core/domain/quran/errors';
import type { QuranEdition } from '@/core/types';

function edition(key: string): QuranEdition {
  return {
    key,
    name: key === '1' ? 'Tajweed' : 'MedinaOld',
    riwaya: 'hafs',
    baseUrl: `https://cdn.test/${key}`,
    bboxUrl: `https://cdn.test/${key}/bbox.json`,
    bboxReversedUrl: `https://cdn.test/${key}/bbox_reversed.json`,
    bboxNormUrl: `https://cdn.test/${key}/bbox_norm.json`,
    bboxReversedNormUrl: `https://cdn.test/${key}/bbox_reversed_norm.json`,
    firstPage: 1,
    lastPage: 604,
    themeColor: '#FFFFD7',
  };
}

const EDITIONS = { '1': edition('1'), '2': edition('2') };

describe('resolveEditionKey', () => {
  it('keeps a stored key that still exists', () => {
    expect(resolveEditionKey(EDITIONS, '2')).toBe('2');
  });

  it('falls back to the first edition when the stored one is gone', () => {
    // A preference can outlive the edition it names.
    expect(resolveEditionKey(EDITIONS, '9')).toBe('1');
    expect(resolveEditionKey(EDITIONS, null)).toBe('1');
    expect(resolveEditionKey(EDITIONS)).toBe('1');
  });

  it('has no answer for an empty catalog', () => {
    expect(resolveEditionKey({}, '1')).toBeUndefined();
  });
});

describe('requireEdition', () => {
  it('returns the requested edition', () => {
    expect(requireEdition(EDITIONS, '2').name).toBe('MedinaOld');
  });

  it('throws a typed error for a key the catalog does not have', () => {
    expect(() => requireEdition(EDITIONS, '9')).toThrow(QuranDataError);
  });
});
