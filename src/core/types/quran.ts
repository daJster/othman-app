/**
 * Qur'an reader models.
 *
 * Ported from the web reader's context types, with two changes:
 *
 *  - fields are camelCase (`page_num` → `pageNumber`), so the boundary parsers
 *    are the only place that knows the CDN's spelling;
 *  - the reader's `{[key: string]: … }` bags became named record types, which
 *    makes it obvious which axis a table is keyed by (surah, then ayah, or
 *    page, then ayah).
 *
 * Coordinates are **fractions of the page** (0–1), not pixels: the mushaf is
 * drawn at whatever size the screen offers, and a pixel rectangle measured on a
 * 412×600 scan would land on the wrong words at any other scale.
 */

export type SurahLocation = 'makka' | 'madina';

/** One rectangle an ayah occupies on its page, as fractions of that page. */
export type Bbox = {
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export type SurahMetadata = {
  /** Surah number, 1–114. The `quran.json` key becomes this field. */
  number: number;
  /** Arabic name, as the mushaf prints it. */
  name: string;
  /** Latin transliteration, for search and for the English UI. */
  nameEnglish: string;
  location: SurahLocation;
  ayahCount: number;
};

/**
 * One mushaf edition.
 *
 * `key` is the key in `editions.json` (`"1"`, `"2"`, `"3"`), not the display
 * name: the CDN can rename an edition without invalidating the stored
 * preference. The page-scale config in `core/config/quran.ts` is keyed by
 * `name`, which is why both fields exist.
 */
export type QuranEdition = {
  key: string;
  name: string;
  riwaya: string;
  baseUrl: string;
  /** Absolute-pixel boxes. Kept because the payload has them; v1 reads `bboxNormUrl`. */
  bboxUrl: string;
  bboxReversedUrl: string;
  /** Boxes normalised to 0–1, keyed by surah then ayah. What the reader uses. */
  bboxNormUrl: string;
  /** The same boxes keyed by page then ayah. */
  bboxReversedNormUrl: string;
  firstPage: number;
  lastPage: number;
  /** Page tint (`#RRGGBB`), used by the reader frame as art, not as a theme token. */
  themeColor: string;
};

/** The boxes of one ayah, independent of which table it came from. */
export type AyahBboxes = {
  absoluteNumber: number;
  bboxes: Bbox[];
};

/** An ayah as it appears in the surah-indexed table. */
export type SurahAyahBboxes = AyahBboxes & {
  /** Page the ayah starts on. An ayah can wrap onto the next page. */
  pageNumber: number;
};

/** An ayah as it appears in the page-indexed table. */
export type PageAyahBboxes = AyahBboxes & {
  surahNumber: number;
};

/** Surah number → ayah-in-surah → boxes. */
export type SurahBboxTable = Record<string, Record<string, SurahAyahBboxes>>;

/** Page number → ayah-in-surah → boxes. */
export type PageBboxTable = Record<string, Record<string, PageAyahBboxes>>;

/**
 * Both views of one edition's boxes.
 *
 * The reader needs both: a page turn asks "what is on page N" (`byPage`), while
 * a tap asks "which surah and ayah is this" and a jump asks "where does ayah X
 * of surah Y start" (`bySurah`). Rebuilding either table on every render would
 * be a 604-page scan; loading both is what the CDN already publishes.
 */
export type EditionBboxes = {
  bySurah: SurahBboxTable;
  byPage: PageBboxTable;
};

/** One ayah's text, from the alquran.cloud API. */
export type AyahContent = {
  absoluteNumber: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
};
