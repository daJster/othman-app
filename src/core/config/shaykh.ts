/**
 * Quran readers (shaykh) available for audio playback.
 *
 * The source data listed one entry twice: `defaultReader` was a verbatim copy
 * of `readers[0]`. Keying the table by `identifier` collapses that duplication
 * and turns "find the reader for this identifier" into an O(1) map lookup
 * instead of a linear scan over 15 objects.
 */

import {
  ALQURAN_CDN_BASE_URL,
  adjacentAyahNumbers,
  isAyahNumberValid,
} from './urls';
import { defineConfig, defineTable } from './primitives';

export type ShaykhLanguage = 'ar' | 'en' | 'fr';

export type Shaykh = {
  readonly name: string;
  readonly englishName: string;
  readonly language: ShaykhLanguage;
  readonly format: 'audio';
  readonly type: 'translation' | 'versebyverse';
  readonly identifier: string;
  readonly direction: string | null;
  /**
   * Path appended to {@link ALQURAN_CDN_BASE_URL}. Was `url_path` in the
   * source data; renamed because the full url is built by
   * {@link shaykhAudioUrl}, not by consumers.
   */
  readonly audioPath: string;
};

const readerRows = {
  'ar.husarymujawwad': {
    identifier: 'ar.husarymujawwad',
    language: 'ar',
    name: 'محمد خليل الحصري (المجود)',
    englishName: 'Husary (Mujawwad)',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/128/ar.husarymujawwad/',
  },
  'ar.abdulbasitmurattal': {
    identifier: 'ar.abdulbasitmurattal',
    language: 'ar',
    name: 'عبد الباسط عبد الصمد المرتل',
    englishName: 'Abdul Basit',
    format: 'audio',
    type: 'translation',
    direction: null,
    audioPath: '/quran/audio/192/ar.abdulbasitmurattal/',
  },
  'ar.abdullahbasfar': {
    identifier: 'ar.abdullahbasfar',
    language: 'ar',
    name: 'عبدالله بصفر',
    englishName: 'Abdullah Basfar',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/192/ar.abdullahbasfar/',
  },
  'ar.abdurrahmaansudais': {
    identifier: 'ar.abdurrahmaansudais',
    language: 'ar',
    name: 'عبد الرحمن السديس',
    englishName: 'Abdurrahmaan As-Sudais',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/192/ar.abdurrahmaansudais/',
  },
  'ar.abdulsamad': {
    identifier: 'ar.abdulsamad',
    language: 'ar',
    name: 'عبدالباسط عبد الصمد',
    englishName: 'Abdul Samad',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/64/ar.abdulsamad/',
  },
  'ar.shaatree': {
    identifier: 'ar.shaatree',
    language: 'ar',
    name: 'أبو بكر الشاطري',
    englishName: 'Abu Bakr Ash-Shaatree',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/128/ar.shaatree/',
  },
  'ar.alafasy': {
    identifier: 'ar.alafasy',
    language: 'ar',
    name: 'مشاري العفاسي',
    englishName: 'Alafasy',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/128/ar.alafasy/',
  },
  'ar.hudhaify': {
    identifier: 'ar.hudhaify',
    language: 'ar',
    name: 'علي بن عبد الرحمن الحذيفي',
    englishName: 'Hudhaify',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/128/ar.hudhaify/',
  },
  'ar.mahermuaiqly': {
    identifier: 'ar.mahermuaiqly',
    language: 'ar',
    name: 'ماهر المعيقلي',
    englishName: 'Maher Al Muaiqly',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/128/ar.mahermuaiqly/',
  },
  'ar.minshawi': {
    identifier: 'ar.minshawi',
    language: 'ar',
    name: 'محمد صديق المنشاوي',
    englishName: 'Minshawi',
    format: 'audio',
    type: 'translation',
    direction: null,
    audioPath: '/quran/audio/128/ar.minshawi/',
  },
  'ar.minshawimujawwad': {
    identifier: 'ar.minshawimujawwad',
    language: 'ar',
    name: 'محمد صديق المنشاوي (المجود)',
    englishName: 'Minshawy (Mujawwad)',
    format: 'audio',
    type: 'translation',
    direction: null,
    audioPath: '/quran/audio/64/ar.minshawimujawwad/',
  },
  'ar.muhammadayyoub': {
    identifier: 'ar.muhammadayyoub',
    language: 'ar',
    name: 'محمد أيوب',
    englishName: 'Muhammad Ayyoub',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/128/ar.muhammadayyoub/',
  },
  'ar.muhammadjibreel': {
    identifier: 'ar.muhammadjibreel',
    language: 'ar',
    name: 'محمد جبريل',
    englishName: 'Muhammad Jibreel',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/128/ar.muhammadjibreel/',
  },
  'fr.leclerc': {
    identifier: 'fr.leclerc',
    language: 'fr',
    name: 'Youssouf Leclerc',
    englishName: 'Youssouf Leclerc',
    format: 'audio',
    type: 'versebyverse',
    direction: null,
    audioPath: '/quran/audio/128/fr.leclerc/',
  },
} satisfies Record<string, Shaykh>;

/** Every identifier present in the table, derived from the data. */
export type ShaykhIdentifier = keyof typeof readerRows;

export const SHAYKH_CONFIG = defineTable(readerRows);

/** Identifier selected when the user has not chosen a reader. */
export const DEFAULT_SHAYKH_IDENTIFIER: ShaykhIdentifier = 'ar.husarymujawwad';

export const DEFAULT_SHAYKH: Shaykh = SHAYKH_CONFIG.get(
  DEFAULT_SHAYKH_IDENTIFIER,
);

export const ALL_READERS = defineConfig<readonly Shaykh[]>(
  SHAYKH_CONFIG.ids.map((id) => SHAYKH_CONFIG.get(id)),
);

/** Resolves a persisted identifier, falling back to the default reader. */
export function getShaykh(identifier?: string | null): Shaykh {
  if (identifier == null) return DEFAULT_SHAYKH;

  return SHAYKH_CONFIG.find(identifier) ?? DEFAULT_SHAYKH;
}

export function listReadersByLanguage(
  language: ShaykhLanguage,
): readonly Shaykh[] {
  return ALL_READERS.filter((shaykh) => shaykh.language === language);
}

/**
 * Full audio url for one ayah of one reader.
 *
 * There is no bitrate argument on purpose: the bitrate is baked into
 * `audioPath`, because islamic.network serves each recording from its own
 * directory. Use {@link listReadersByLanguage} and `AUDIO_QUALITIES` to decide
 * *which* recording to point at.
 */
export function shaykhAudioUrl(shaykh: Shaykh, absoluteAyah: number): string {
  if (!isAyahNumberValid(absoluteAyah)) {
    throw new RangeError(`Invalid absolute ayah number: ${absoluteAyah}`);
  }

  return `${ALQURAN_CDN_BASE_URL}${shaykh.audioPath}${absoluteAyah}.mp3`;
}

/** Audio urls worth prefetching alongside the ayah being played. */
export function shaykhPrefetchUrls(
  shaykh: Shaykh,
  absoluteAyah: number,
): string[] {
  return adjacentAyahNumbers(absoluteAyah).map((ayah) =>
    shaykhAudioUrl(shaykh, ayah),
  );
}
