import { absoluteAyahNumber, stepAyah } from '../audio';

/**
 * Audio advance boundaries.
 *
 * Auto-read must take exactly one step: `adjacentAyahNumbers` returns several
 * neighbours for prefetch and is not a valid "next" value. These cases pin the
 * single-step contract, including the surah boundary and wrap direction.
 */

const COUNTS: Record<number, number> = { 1: 7, 2: 286, 114: 6 };

const ayahCountOf = (surah: number) => COUNTS[surah] ?? null;

describe('stepAyah', () => {
  it('moves one ayah forward inside the surah', () => {
    expect(
      stepAyah({ surah: 2, ayah: 255 }, 'forward', ayahCountOf, false),
    ).toEqual({ surah: 2, ayah: 256 });
  });

  it('moves one ayah backward inside the surah', () => {
    expect(
      stepAyah({ surah: 2, ayah: 255 }, 'backward', ayahCountOf, false),
    ).toEqual({ surah: 2, ayah: 254 });
  });

  it('stops at the last and first ayah without wrap', () => {
    expect(
      stepAyah({ surah: 1, ayah: 7 }, 'forward', ayahCountOf, false),
    ).toBeNull();
    expect(
      stepAyah({ surah: 1, ayah: 1 }, 'backward', ayahCountOf, false),
    ).toBeNull();
  });

  it('crosses into the next surah when wrap is enabled', () => {
    expect(
      stepAyah({ surah: 1, ayah: 7 }, 'forward', ayahCountOf, true),
    ).toEqual({
      surah: 2,
      ayah: 1,
    });
    expect(
      stepAyah({ surah: 114, ayah: 6 }, 'forward', ayahCountOf, true),
    ).toEqual({
      surah: 1,
      ayah: 1,
    });
  });

  it('crosses backward to the previous surah’s last ayah when wrap is enabled', () => {
    expect(
      stepAyah({ surah: 2, ayah: 1 }, 'backward', ayahCountOf, true),
    ).toEqual({
      surah: 1,
      ayah: 7,
    });
    expect(
      stepAyah({ surah: 1, ayah: 1 }, 'backward', ayahCountOf, true),
    ).toEqual({
      surah: 114,
      ayah: 6,
    });
  });

  it('stops when the surah metadata is missing or the position is invalid', () => {
    expect(
      stepAyah({ surah: 60, ayah: 1 }, 'forward', ayahCountOf, true),
    ).toBeNull();
    expect(
      stepAyah({ surah: 2, ayah: 287 }, 'forward', ayahCountOf, true),
    ).toBeNull();
    expect(
      stepAyah({ surah: 0, ayah: 1 }, 'forward', ayahCountOf, true),
    ).toBeNull();
    expect(
      stepAyah({ surah: 2, ayah: 1 }, 'backward', ayahCountOf, true),
    ).not.toBeNull();
    expect(
      stepAyah({ surah: 2, ayah: 1 }, 'backward', () => null, true),
    ).toBeNull();
  });
});

describe('absoluteAyahNumber', () => {
  const counts = (surah: number) => {
    if (surah >= 1 && surah <= 114) return 3;

    return null;
  };

  it('counts the preceding surahs before the ayah', () => {
    expect(absoluteAyahNumber({ surah: 1, ayah: 1 }, counts)).toBe(1);
    expect(absoluteAyahNumber({ surah: 2, ayah: 1 }, counts)).toBe(4);
    expect(absoluteAyahNumber({ surah: 114, ayah: 3 }, counts)).toBe(342);
  });

  it('keeps a wrap from 114:last to 1:1 at absolute 1', () => {
    const wrapped = stepAyah({ surah: 114, ayah: 3 }, 'forward', counts, true);

    expect(wrapped).toEqual({ surah: 1, ayah: 1 });
    expect(absoluteAyahNumber(wrapped!, counts)).toBe(1);
  });

  it('refuses an invalid ref or incomplete metadata', () => {
    expect(absoluteAyahNumber({ surah: 2, ayah: 4 }, counts)).toBeNull();
    expect(absoluteAyahNumber({ surah: 0, ayah: 1 }, counts)).toBeNull();
    expect(absoluteAyahNumber({ surah: 3, ayah: 1 }, ayahCountOf)).toBeNull();
  });
});
