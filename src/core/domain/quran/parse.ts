import { MAX_ABSOLUTE_AYAH_NUMBER } from '../../config/urls';
import type {
  AyahContent,
  Bbox,
  EditionBboxes,
  PageAyahBboxes,
  QuranEdition,
  SurahAyahBboxes,
  SurahLocation,
  SurahMetadata,
} from '../../types/quran';
import { QuranDataError, type QuranDataSource } from './errors';
import { MAX_AYAH_IN_SURAH, QURAN_PAGE_COUNT, SURAH_COUNT } from './surah';

/**
 * Boundary parsers for every Qur'an payload.
 *
 * The CDN is untyped JSON that the app treats as data, not as a promise: a
 * missing field, a box outside the page or a surah table with 113 entries is
 * caught here, once, with the exact path in the message. Downstream code can
 * then work with the typed models without a `?` on every second line.
 *
 * Why reject rather than repair:
 *
 *  - A clamped box would silently select the wrong words, which is worse than an
 *    error screen the reader can retry.
 *  - A skipped surah would leave a hole in a 114-cell picker that nothing else
 *    would notice.
 *
 * The parsers are pure and live in `core`, which is also what lets them be
 * tested without a network or a renderer.
 */

type JsonObject = Record<string, unknown>;

const MAX_UNBOUNDED = Number.MAX_SAFE_INTEGER;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(
  value: unknown,
  source: QuranDataSource,
  path: string,
): JsonObject {
  if (!isObject(value)) {
    throw new QuranDataError(source, `${path} must be an object`);
  }

  return value;
}

function integer(
  record: JsonObject,
  key: string,
  source: QuranDataSource,
  path: string,
  min: number,
  max = MAX_UNBOUNDED,
): number {
  const value = record[key];

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new QuranDataError(source, `${path}.${key} must be an integer`);
  }

  if (value < min || value > max) {
    throw new QuranDataError(
      source,
      `${path}.${key} must be ${min}-${max}, received ${value}`,
    );
  }

  return value;
}

function text(
  record: JsonObject,
  key: string,
  source: QuranDataSource,
  path: string,
): string {
  const value = record[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new QuranDataError(
      source,
      `${path}.${key} must be a non-empty string`,
    );
  }

  return value;
}

function httpsUrl(
  record: JsonObject,
  key: string,
  source: QuranDataSource,
  path: string,
): string {
  const value = text(record, key, source, path);

  if (!/^https:\/\//i.test(value)) {
    throw new QuranDataError(source, `${path}.${key} must be an https url`);
  }

  return value;
}

function hexColor(
  record: JsonObject,
  key: string,
  source: QuranDataSource,
  path: string,
): string {
  const value = text(record, key, source, path);

  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new QuranDataError(source, `${path}.${key} must be #RRGGBB`);
  }

  return value;
}

/** A numeric key as it appears in the JSON (`"1"`, `"114"`), validated. */
function keyInteger(
  key: string,
  source: QuranDataSource,
  path: string,
  min: number,
  max: number,
): number {
  if (!/^\d+$/.test(key)) {
    throw new QuranDataError(source, `${path} key "${key}" must be a number`);
  }

  const value = Number(key);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new QuranDataError(
      source,
      `${path} key "${key}" must be ${min}-${max}`,
    );
  }

  return value;
}

function fraction(
  record: JsonObject,
  key: string,
  source: QuranDataSource,
  path: string,
): number {
  const value = record[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new QuranDataError(source, `${path}.${key} must be a finite number`);
  }

  if (value < 0 || value > 1) {
    throw new QuranDataError(
      source,
      `${path}.${key} must be a fraction (0-1), received ${value}`,
    );
  }

  return value;
}

/**
 * One normalised rectangle, or `null` when it has no area.
 *
 * `bottom > top` and `right > left` are required for a tappable target. The CDN
 * ships one zero-width box (surah 8, ayah 52) in the current Tajweed payload;
 * rejecting the whole edition for it left the reader unusable, so a degenerate
 * box is dropped instead. It is never clamped or moved onto neighbouring text.
 */
function parseBbox(
  value: unknown,
  source: QuranDataSource,
  path: string,
): Bbox | null {
  const box = object(value, source, path);
  const top = fraction(box, 'top', source, path);
  const left = fraction(box, 'left', source, path);
  const bottom = fraction(box, 'bottom', source, path);
  const right = fraction(box, 'right', source, path);

  if (top >= bottom || left >= right) return null;

  return { top, left, bottom, right };
}

function parseBboxList(
  value: unknown,
  source: QuranDataSource,
  path: string,
): Bbox[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new QuranDataError(source, `${path} must be a non-empty array`);
  }

  return value
    .map((box, index) => parseBbox(box, source, `${path}[${index}]`))
    .filter((box): box is Bbox => box !== null);
}

/**
 * `editions.json` → editions keyed by their CDN key.
 *
 * `first_page <= last_page` is checked here because every page computation
 * (`clamp`, `next`, `prev`) would otherwise produce an empty range for a typo
 * that looks like a valid pair.
 */
export function parseEditions(raw: unknown): Record<string, QuranEdition> {
  const payload = object(raw, 'editions', 'payload');
  const keys = Object.keys(payload);

  if (keys.length === 0) {
    throw new QuranDataError('editions', 'payload contains no editions');
  }

  const editions: Record<string, QuranEdition> = {};

  for (const key of keys) {
    if (!/^\d+$/.test(key)) {
      throw new QuranDataError(
        'editions',
        `edition key "${key}" must be a number`,
      );
    }

    const path = `editions["${key}"]`;
    const row = object(payload[key], 'editions', path);
    const firstPage = integer(row, 'first_page', 'editions', path, 1);
    // `last_page` is not capped at 604: MedinaOld's scan set has 605 pages, and
    // the standard mushaf length is a property of the scan, not of the app.
    const lastPage = integer(row, 'last_page', 'editions', path, firstPage);

    editions[key] = {
      key,
      name: text(row, 'name', 'editions', path),
      riwaya: text(row, 'riwaya', 'editions', path),
      baseUrl: httpsUrl(row, 'base_url', 'editions', path),
      bboxUrl: httpsUrl(row, 'bbox_url', 'editions', path),
      bboxReversedUrl: httpsUrl(row, 'bbox_reversed_url', 'editions', path),
      bboxNormUrl: httpsUrl(row, 'bbox_norm_url', 'editions', path),
      bboxReversedNormUrl: httpsUrl(
        row,
        'bbox_reversed_norm_url',
        'editions',
        path,
      ),
      firstPage,
      lastPage,
      themeColor: hexColor(row, 'theme_color', 'editions', path),
    };
  }

  return editions;
}

/**
 * `quran.json` → the 114 surahs.
 *
 * The count is enforced: a 113-entry table means the payload is broken, and a
 * picker with a silent hole is harder to diagnose than a retry.
 */
export function parseSurahMetadata(
  raw: unknown,
): Record<string, SurahMetadata> {
  const payload = object(raw, 'surah-metadata', 'payload');
  const keys = Object.keys(payload);

  if (keys.length !== SURAH_COUNT) {
    throw new QuranDataError(
      'surah-metadata',
      `expected ${SURAH_COUNT} surahs, received ${keys.length}`,
    );
  }

  const surahs: Record<string, SurahMetadata> = {};

  for (let number = 1; number <= SURAH_COUNT; number += 1) {
    const key = String(number);
    const path = `surah ${number}`;
    const row = object(payload[key], 'surah-metadata', path);
    const location = text(row, 'location', 'surah-metadata', path);

    if (location !== 'makka' && location !== 'madina') {
      throw new QuranDataError(
        'surah-metadata',
        `${path}.location must be makka or madina`,
      );
    }

    surahs[key] = {
      number,
      name: text(row, 'name', 'surah-metadata', path),
      nameEnglish: text(row, 'name_en', 'surah-metadata', path),
      location: location as SurahLocation,
      ayahCount: integer(
        row,
        'number_of_ayat',
        'surah-metadata',
        path,
        1,
        MAX_AYAH_IN_SURAH,
      ),
    };
  }

  return surahs;
}

/**
 * `*_bbox_norm.json` → boxes keyed by surah, then ayah.
 *
 * Page numbers are checked against the edition because a box on a page the
 * edition does not have is a data/edition mismatch, not a rendering problem.
 */
export function parseSurahBboxes(
  raw: unknown,
  edition: Pick<QuranEdition, 'firstPage' | 'lastPage'>,
): Record<string, Record<string, SurahAyahBboxes>> {
  const payload = object(raw, 'surah-bboxes', 'payload');
  const surahs = object(payload.surahs, 'surah-bboxes', 'surahs');
  const table: Record<string, Record<string, SurahAyahBboxes>> = {};

  for (const [surahKey, surahValue] of Object.entries(surahs)) {
    keyInteger(surahKey, 'surah-bboxes', 'surahs', 1, SURAH_COUNT);

    const path = `surahs["${surahKey}"]`;
    const ayat = object(
      object(surahValue, 'surah-bboxes', path).ayat,
      'surah-bboxes',
      `${path}.ayat`,
    );
    const rows: Record<string, SurahAyahBboxes> = {};

    for (const [ayahKey, ayahValue] of Object.entries(ayat)) {
      keyInteger(ayahKey, 'surah-bboxes', `${path}.ayat`, 1, MAX_AYAH_IN_SURAH);

      const ayahPath = `${path}.ayat["${ayahKey}"]`;
      const row = object(ayahValue, 'surah-bboxes', ayahPath);

      rows[ayahKey] = {
        absoluteNumber: integer(
          row,
          'absolute_number',
          'surah-bboxes',
          ayahPath,
          1,
          MAX_ABSOLUTE_AYAH_NUMBER,
        ),
        pageNumber: integer(
          row,
          'page_num',
          'surah-bboxes',
          ayahPath,
          edition.firstPage,
          edition.lastPage,
        ),
        bboxes: parseBboxList(row.bboxes, 'surah-bboxes', `${ayahPath}.bboxes`),
      };
    }

    if (Object.keys(rows).length === 0) {
      throw new QuranDataError(
        'surah-bboxes',
        `${path}.ayat must not be empty`,
      );
    }

    table[surahKey] = rows;
  }

  if (Object.keys(table).length === 0) {
    throw new QuranDataError('surah-bboxes', 'payload contains no surahs');
  }

  return table;
}

/**
 * `*_bbox_reversed_norm.json` → boxes keyed by page, then ayah.
 *
 * This is the table a page turn reads, so every page key must fall inside the
 * edition's range: a `"604"` in a 559-page Warsh edition would render an empty
 * mushaf with no error to explain it.
 */
export function parsePageBboxes(
  raw: unknown,
  edition: Pick<QuranEdition, 'firstPage' | 'lastPage'>,
): Record<string, Record<string, PageAyahBboxes>> {
  const payload = object(raw, 'page-bboxes', 'payload');
  const table: Record<string, Record<string, PageAyahBboxes>> = {};

  for (const [pageKey, pageValue] of Object.entries(payload)) {
    keyInteger(
      pageKey,
      'page-bboxes',
      'payload',
      edition.firstPage,
      edition.lastPage,
    );

    const path = `pages["${pageKey}"]`;
    const ayat = object(
      object(pageValue, 'page-bboxes', path).ayat,
      'page-bboxes',
      `${path}.ayat`,
    );
    const rows: Record<string, PageAyahBboxes> = {};

    for (const [ayahKey, ayahValue] of Object.entries(ayat)) {
      keyInteger(ayahKey, 'page-bboxes', `${path}.ayat`, 1, MAX_AYAH_IN_SURAH);

      const ayahPath = `${path}.ayat["${ayahKey}"]`;
      const row = object(ayahValue, 'page-bboxes', ayahPath);

      rows[ayahKey] = {
        absoluteNumber: integer(
          row,
          'absolute_number',
          'page-bboxes',
          ayahPath,
          1,
          MAX_ABSOLUTE_AYAH_NUMBER,
        ),
        surahNumber: integer(
          row,
          'surah',
          'page-bboxes',
          ayahPath,
          1,
          SURAH_COUNT,
        ),
        bboxes: parseBboxList(row.bboxes, 'page-bboxes', `${ayahPath}.bboxes`),
      };
    }

    if (Object.keys(rows).length === 0) {
      throw new QuranDataError('page-bboxes', `${path}.ayat must not be empty`);
    }

    table[pageKey] = rows;
  }

  if (Object.keys(table).length === 0) {
    throw new QuranDataError('page-bboxes', 'payload contains no pages');
  }

  return table;
}

/** Both tables of one edition, ready to be cached together. */
export function parseEditionBboxes(
  surahPayload: unknown,
  pagePayload: unknown,
  edition: Pick<QuranEdition, 'firstPage' | 'lastPage'>,
): EditionBboxes {
  return {
    bySurah: parseSurahBboxes(surahPayload, edition),
    byPage: parsePageBboxes(pagePayload, edition),
  };
}

/**
 * `api.alquran.cloud/v1/ayah/{n}` → one ayah's text and position.
 *
 * `sajda` arrives as `false` or as an object describing the prostration, so it
 * is flattened to the boolean the UI actually needs. Requiring a strict boolean
 * would reject every sajdah ayah — the one place a reader is most likely to
 * notice.
 */
export function parseAyahContent(raw: unknown): AyahContent {
  const payload = object(raw, 'ayah-content', 'payload');

  if (payload.code !== 200) {
    throw new QuranDataError(
      'ayah-content',
      `API answered with code ${String(payload.code)}`,
    );
  }

  const data = object(payload.data, 'ayah-content', 'data');
  const sajda = data.sajda;

  if (typeof sajda !== 'boolean' && !isObject(sajda)) {
    throw new QuranDataError(
      'ayah-content',
      'data.sajda must be a boolean or an object',
    );
  }

  return {
    absoluteNumber: integer(
      data,
      'number',
      'ayah-content',
      'data',
      1,
      MAX_ABSOLUTE_AYAH_NUMBER,
    ),
    text: text(data, 'text', 'ayah-content', 'data'),
    numberInSurah: integer(
      data,
      'numberInSurah',
      'ayah-content',
      'data',
      1,
      MAX_AYAH_IN_SURAH,
    ),
    juz: integer(data, 'juz', 'ayah-content', 'data', 1, 30),
    manzil: integer(data, 'manzil', 'ayah-content', 'data', 1, 7),
    page: integer(data, 'page', 'ayah-content', 'data', 1, QURAN_PAGE_COUNT),
    ruku: integer(data, 'ruku', 'ayah-content', 'data', 1, 600),
    hizbQuarter: integer(data, 'hizbQuarter', 'ayah-content', 'data', 1, 240),
    sajda: sajda !== false,
  };
}
