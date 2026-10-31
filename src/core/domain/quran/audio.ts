import { SURAH_COUNT, isSurahNumber } from './surah';

/**
 * Adjacent-ayah ordering for audio.
 *
 * The playback package needs one step at a time, in a direction, with an
 * explicit boundary decision. It deliberately does not use
 * `adjacentAyahNumbers`: that helper returns the previous ayah and three
 * forward neighbours because it exists for prefetching, so treating its output
 * as "the next ayah" would skip two ayat.
 *
 * `ayahCountOf` is a lookup rather than a table so this stays pure and does not
 * care whether the caller's metadata is keyed by string or number. `null` means
 * the surah is unknown, which stops the walk instead of inventing a length.
 */
export type AyahRef = {
  /** Surah number, 1–114. */
  surah: number;
  /** Ayah-in-surah, 1–286. */
  ayah: number;
};

export type AyahDirection = 'forward' | 'backward';

/**
 * One canonical step from `current`.
 *
 * - Inside the surah: ayah ± 1.
 * - At a boundary with `wrap: false`: `null` (stop; never request an
 *   out-of-range ayah).
 * - At a boundary with `wrap: true`: the first ayah of the next surah, or the
 *   last ayah of the previous surah. 114:last wraps to 1:1 and 1:1 wraps to
 *   114:last.
 */
export function stepAyah(
  current: AyahRef,
  direction: AyahDirection,
  ayahCountOf: (surah: number) => number | null,
  wrap: boolean,
): AyahRef | null {
  if (!isSurahNumber(current.surah)) return null;

  const count = ayahCountOf(current.surah);
  if (
    count === null ||
    !Number.isInteger(current.ayah) ||
    current.ayah < 1 ||
    current.ayah > count
  ) {
    return null;
  }

  const target = current.ayah + (direction === 'forward' ? 1 : -1);
  if (target >= 1 && target <= count) {
    return { surah: current.surah, ayah: target };
  }

  if (!wrap) return null;

  const surah =
    direction === 'forward'
      ? current.surah === SURAH_COUNT
        ? 1
        : current.surah + 1
      : current.surah === 1
        ? SURAH_COUNT
        : current.surah - 1;

  if (direction === 'forward') return { surah, ayah: 1 };

  const previousCount = ayahCountOf(surah);

  return previousCount === null ? null : { surah, ayah: previousCount };
}

/**
 * The ayah's absolute number (1–6236).
 *
 * Auto-advance works in surah/ayah pairs because that is what the store selects,
 * but the audio URL is keyed by the absolute number. Deriving it from the
 * metadata instead of treating "absolute ± 1" as universal keeps the wrap case
 * correct: 114:6 wraps to 1:1, whose absolute number is 1, not 6237.
 *
 * `null` means either the ref is invalid or the metadata needed to count the
 * preceding surahs is incomplete.
 */
export function absoluteAyahNumber(
  ref: AyahRef,
  ayahCountOf: (surah: number) => number | null,
): number | null {
  if (!isSurahNumber(ref.surah)) return null;
  if (!Number.isInteger(ref.ayah) || ref.ayah < 1) return null;

  const count = ayahCountOf(ref.surah);
  if (count === null || ref.ayah > count) return null;

  let preceding = 0;

  for (let surah = 1; surah < ref.surah; surah += 1) {
    const precedingCount = ayahCountOf(surah);
    if (precedingCount === null) return null;

    preceding += precedingCount;
  }

  return preceding + ref.ayah;
}

/**
 * Whether `ref` is the last ayah of its surah — the point where auto-read stops
 * unless wrapping is enabled.
 */
export function isLastAyahOfSurah(
  ref: AyahRef,
  ayahCountOf: (surah: number) => number | null,
): boolean {
  const count = ayahCountOf(ref.surah);

  return count !== null && ref.ayah === count;
}
