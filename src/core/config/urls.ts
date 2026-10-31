/**
 * Remote endpoints and the validators that guard them.
 *
 * Base urls are plain constants; anything that builds a concrete url is a
 * function here so path shapes live in exactly one place instead of being
 * re-concatenated at each call site.
 */

import { defineConfig } from './primitives';

export const CDN_BASE_URL = 'https://cdn.kuttab-othman.workers.dev';
export const ALQURAN_API_BASE_URL = 'https://api.alquran.cloud';
export const ALQURAN_CDN_BASE_URL = 'https://cdn.islamic.network';
export const QURANPEDIA_BASE_URL = 'https://api.quranpedia.net';

/**
 * The project's public site.
 *
 * The only external destination About offers: everything else the legacy footer
 * linked to (`/terms`, `/privacy`, `/faq`, `/download`) was a route the web app
 * never built, so those links 404'd. A dead link is worse than a missing one.
 */
export const WEBSITE_URL = 'https://kuttab-othman.web.app/';

export const QURAN_METADATA_URL = `${CDN_BASE_URL}/quran.json`;
export const QURAN_EDITIONS_URL = `${CDN_BASE_URL}/editions.json`;

export const MAX_ABSOLUTE_AYAH_NUMBER = 6236;

export const isAyahNumberValid = (n: number): boolean =>
  Number.isInteger(n) && n >= 1 && n <= MAX_ABSOLUTE_AYAH_NUMBER;

function requireAyahNumber(absoluteAyah: number): number {
  if (!isAyahNumberValid(absoluteAyah)) {
    throw new RangeError(
      `Absolute ayah number must be 1-${MAX_ABSOLUTE_AYAH_NUMBER}, received ${absoluteAyah}`,
    );
  }

  return absoluteAyah;
}

/** `/v1/ayah/{n}` on the alquran.cloud API. */
export function quranAyahUrl(absoluteAyah: number): string {
  return `${ALQURAN_API_BASE_URL}/v1/ayah/${requireAyahNumber(absoluteAyah)}`;
}

/**
 * Relative offsets worth prefetching around the ayah being played. The
 * previous ayah first, then the next three, which covers a listener skipping
 * ahead without flooding the CDN.
 *
 * `as const` alone would only narrow the type; `defineConfig` is what actually
 * prevents a caller from mutating shared module state.
 */
export const PREFETCH_AYAH_OFFSETS = defineConfig([-1, 1, 2, 3] as const);

/** In-range absolute ayah numbers around `absoluteAyah`. */
export function adjacentAyahNumbers(absoluteAyah: number): number[] {
  return PREFETCH_AYAH_OFFSETS.map((offset) => absoluteAyah + offset).filter(
    isAyahNumberValid,
  );
}

/**
 * Joins a path onto the quranpedia host.
 *
 * Kept generic on purpose: the tafsir endpoint shapes are owned by the tafsir
 * repository, and this layer should not have to change when they do.
 */
export function quranpediaUrl(path: string): string {
  return `${QURANPEDIA_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

/** Bitrates offered by the islamic.network audio CDN, best first. */
export const AUDIO_QUALITIES = defineConfig([192, 128, 64, 48, 40, 3] as const);

export type AudioQuality = (typeof AUDIO_QUALITIES)[number];

/** Quality used when a reader has no explicit preference. */
export const DEFAULT_AUDIO_QUALITY: AudioQuality = 128;

export function isAudioQuality(quality: number): quality is AudioQuality {
  return (AUDIO_QUALITIES as readonly number[]).includes(quality);
}

/** Narrows a number to a supported bitrate, falling back to the default. */
export function toAudioQuality(quality: number): AudioQuality {
  return isAudioQuality(quality) ? quality : DEFAULT_AUDIO_QUALITY;
}
