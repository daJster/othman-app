import { checksum, stableStringify } from '../checksum';

/**
 * The checksum is the cache-hit test, so these cases are about *equality*:
 * the same payload in a different shape must hash the same, and a real change
 * must not.
 */
describe('stableStringify', () => {
  it('sorts object keys at every depth', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(
      stableStringify({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });

  it('keeps array order significant', () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });

  it('writes a Date as its ISO string, matching the storage round trip', () => {
    const date = new Date('2026-11-23T10:00:00.000Z');

    expect(stableStringify({ at: date })).toBe(
      stableStringify({ at: date.toISOString() }),
    );
  });

  it('drops undefined object fields and nulls array holes, like JSON', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe(
      stableStringify({ a: 1 }),
    );
    expect(stableStringify([1, undefined])).toBe('[1,null]');
  });

  it('round-trips through JSON', () => {
    const value = { name: 'الطالب', count: 3, nested: { ok: true } };

    expect(stableStringify(JSON.parse(JSON.stringify(value)))).toBe(
      stableStringify(value),
    );
  });
});

describe('checksum', () => {
  it('is stable across key order and independent calls', () => {
    expect(checksum({ a: 1, b: [2, 3] })).toBe(checksum({ b: [2, 3], a: 1 }));
  });

  it('changes when a value changes', () => {
    expect(checksum({ page: 1 })).not.toBe(checksum({ page: 2 }));
  });

  it('changes when an array gains an item', () => {
    expect(checksum([{ id: 1 }])).not.toBe(checksum([{ id: 1 }, { id: 2 }]));
  });

  it('produces a fixed-width hex string', () => {
    expect(checksum({ any: 'value' })).toMatch(/^[0-9a-f]{16}$/);
  });
});
