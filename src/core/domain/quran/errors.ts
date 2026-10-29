/**
 * A payload the reader could not trust.
 *
 * Every remote table (editions, surah metadata, both bbox views, ayah text) is
 * an external boundary. Validating it in the parser and throwing this error is
 * what turns "the grid is half drawn" or "the page is blank but the footer says
 * 12" into one retryable query error with a source attached — which is also the
 * only thing a bug report needs to identify the bad file.
 *
 * Transport failures keep their own types (`HttpError`, `HttpTimeoutError`,
 * `HttpAbortError` in `platform/http`): "the CDN said 503" and "the CDN sent
 * nonsense" are different problems and deserve different words in a log.
 */
export type QuranDataSource =
  | 'editions'
  | 'surah-metadata'
  | 'surah-bboxes'
  | 'page-bboxes'
  | 'ayah-content';

export class QuranDataError extends Error {
  readonly source: QuranDataSource;
  readonly detail: string;

  constructor(source: QuranDataSource, detail: string) {
    super(`[quran:${source}] ${detail}`);
    this.name = 'QuranDataError';
    this.source = source;
    this.detail = detail;
  }
}
