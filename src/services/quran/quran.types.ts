import type {
  AyahContent,
  EditionBboxes,
  QuranEdition,
  SurahMetadata,
} from '@/core/types';

/**
 * Where the reader's data comes from.
 *
 * Every repository is an interface rather than a concrete module for the same
 * reason meetings has one: the HTTP implementation can be replaced by a fixture
 * in a test (and by an offline bundle later) without the service or the screens
 * knowing. The transport is injected too, so a test asserts the URL that would
 * have been requested instead of mocking `fetch`.
 */

export type EditionTable = Record<string, QuranEdition>;

export type SurahTable = Record<string, SurahMetadata>;

/** `editions.json`. */
export interface EditionsRepository {
  list(): Promise<EditionTable>;
}

/** `quran.json` — the 114 surahs. */
export interface MetadataRepository {
  list(): Promise<SurahTable>;
}

/** Both bbox tables of one edition, fetched in parallel. */
export interface BboxesRepository {
  load(edition: QuranEdition): Promise<EditionBboxes>;
}

/** One ayah's text, by absolute number (1–6236). */
export interface AyahContentRepository {
  byAbsoluteNumber(absoluteNumber: number): Promise<AyahContent>;
}

export type QuranRepositories = {
  editions: EditionsRepository;
  metadata: MetadataRepository;
  bboxes: BboxesRepository;
  content: AyahContentRepository;
};

/** The two boot payloads, loaded together. */
export type QuranCatalog = {
  editions: EditionTable;
  surahs: SurahTable;
};

export interface QuranService {
  /**
   * Editions and surah metadata, in parallel.
   *
   * The web provider fetched these two sequentially (a waterfall that cost a
   * full round trip before the reader could paint). Nothing here depends on the
   * other file, so one `Promise.all` is all the ordering the app needs.
   */
  loadCatalog(): Promise<QuranCatalog>;
  loadBboxes(edition: QuranEdition): Promise<EditionBboxes>;
  loadAyah(absoluteNumber: number): Promise<AyahContent>;
}
