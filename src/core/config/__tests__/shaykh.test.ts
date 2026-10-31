import {
  DEFAULT_SHAYKH,
  SHAYKH_CONFIG,
  adjacentAyahNumbers,
  getShaykh,
  shaykhAudioUrl,
  shaykhPrefetchUrls,
} from '..';

/**
 * Audio URL and reciter boundaries.
 *
 * The URL builder bakes each reciter's bitrate into its directory, so the only
 * variable is the absolute ayah. These cases pin the path shape, the range
 * rejection and the fact that the prefetch helper returns several neighbours —
 * it is not an auto-advance function.
 */

describe('shaykhAudioUrl', () => {
  it('builds the reciter directory with the absolute ayah file name', () => {
    expect(shaykhAudioUrl(DEFAULT_SHAYKH, 1)).toMatch(
      /\/quran\/audio\/128\/ar\.husarymujawwad\/1\.mp3$/,
    );
    expect(
      shaykhAudioUrl(SHAYKH_CONFIG.get('ar.abdulbasitmurattal'), 6236),
    ).toMatch(/\/quran\/audio\/192\/ar\.abdulbasitmurattal\/6236\.mp3$/);
  });

  it('rejects an absolute number outside 1–6236', () => {
    expect(() => shaykhAudioUrl(DEFAULT_SHAYKH, 0)).toThrow(RangeError);
    expect(() => shaykhAudioUrl(DEFAULT_SHAYKH, 6237)).toThrow(RangeError);
    expect(() => shaykhAudioUrl(DEFAULT_SHAYKH, 1.5)).toThrow(RangeError);
  });

  it('uses each reciter’s own bitrate and path', () => {
    const ids = SHAYKH_CONFIG.ids;
    const urls = ids.map((id) => shaykhAudioUrl(SHAYKH_CONFIG.get(id), 1));

    expect(new Set(urls).size).toBe(ids.length);
  });
});

describe('reciter lookup', () => {
  it('falls back to the default reader for an unknown or missing id', () => {
    expect(getShaykh(undefined)).toBe(DEFAULT_SHAYKH);
    expect(getShaykh(null)).toBe(DEFAULT_SHAYKH);
    expect(getShaykh('ar.unknown')).toBe(DEFAULT_SHAYKH);
    expect(getShaykh('ar.alafasy').identifier).toBe('ar.alafasy');
  });
});

describe('prefetch helpers', () => {
  it('returns several neighbours, so it cannot be used as “the next ayah”', () => {
    expect(adjacentAyahNumbers(100)).toEqual([99, 101, 102, 103]);
    expect(adjacentAyahNumbers(1)).toEqual([2, 3, 4]);
    expect(adjacentAyahNumbers(6236)).toEqual([6235]);
  });

  it('builds one URL per neighbour for the selected reciter', () => {
    const urls = shaykhPrefetchUrls(DEFAULT_SHAYKH, 100);

    expect(urls).toHaveLength(4);
    expect(urls[1]).toMatch(/\/101\.mp3$/);
  });
});
