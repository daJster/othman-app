/**
 * Platform-agnostic application configuration.
 *
 * Everything here is static, deeply frozen data built at module load, plus the
 * accessors and url builders that read it. Nothing in this folder imports
 * React, react-native, expo, the DOM, or Firebase — the presentation layer
 * consumes it and supplies its own icon components, so the same config drives
 * web and native.
 *
 * Named exports only, and no `export *`: a barrel that re-exports everything
 * defeats tree-shaking once this folder grows.
 *
 * Migrating off `src/data/configData.ts`:
 *
 *   createDefaultNavConfig()          -> APP_ROUTES (src/features/navigation)
 *   createAccountSettingsNavConfig()  -> APP_ROUTES (routes that exist, only)
 *   createMeetingStatusConfig()[st]   -> getMeetingStatusConfig(st)
 *   createAttendeeListConfig()        -> ATTENDEE_LIST_CONFIG
 *   createShaykhListConfig()          -> SHAYKH_CONFIG / getShaykh(id)
 *   createQuranPageScaleConfig()[e]   -> getEditionPageSize(e) / getEditionPageScale(e, page)
 *   createPhoneExtensionList()        -> PHONE_EXTENSION_OPTIONS
 */

export { defineConfig, defineTable } from './primitives';
export type { ConfigRow, ConfigTable, ResolvedConfigTable } from './primitives';

export type {
  AttendeeListConfig,
  AttendeeSize,
  IconName,
  IconRegistry,
  MeetingStatusConfig,
  PhoneExtension,
  StatusTone,
} from './types';

export {
  ALQURAN_API_BASE_URL,
  ALQURAN_CDN_BASE_URL,
  AUDIO_QUALITIES,
  CDN_BASE_URL,
  DEFAULT_AUDIO_QUALITY,
  MAX_ABSOLUTE_AYAH_NUMBER,
  PREFETCH_AYAH_OFFSETS,
  QURAN_EDITIONS_URL,
  QURAN_METADATA_URL,
  QURANPEDIA_BASE_URL,
  adjacentAyahNumbers,
  isAudioQuality,
  isAyahNumberValid,
  quranAyahUrl,
  quranpediaUrl,
  toAudioQuality,
} from './urls';
export type { AudioQuality } from './urls';

export {
  ALL_READERS,
  DEFAULT_SHAYKH,
  DEFAULT_SHAYKH_IDENTIFIER,
  SHAYKH_CONFIG,
  getShaykh,
  listReadersByLanguage,
  shaykhAudioUrl,
  shaykhPrefetchUrls,
} from './shaykh';
export type { Shaykh, ShaykhIdentifier, ShaykhLanguage } from './shaykh';

export {
  DEFAULT_PAGE_KEY,
  QURAN_EDITIONS,
  QURAN_PAGE_SCALE_CONFIG,
  getEditionPageScale,
  getEditionPageSize,
} from './quran';
export type {
  EditionPageConfig,
  PageScale,
  PageSize,
  QuranEditionId,
} from './quran';

export {
  ATTENDEE_LIST_CONFIG,
  MEETING_STATUS_CONFIG,
  getMeetingStatusConfig,
} from './meetings';

export {
  PHONE_EXTENSIONS,
  PHONE_EXTENSION_OPTIONS,
  findPhoneExtensionByDialCode,
  getPhoneExtension,
} from './phone';
export type { PhoneIso } from './phone';

// Tone/status *intent* stays in `./meetings`; the class strings that used to
// live in `./tokens` are UI concerns and move to `src/ui` (P2.1).
