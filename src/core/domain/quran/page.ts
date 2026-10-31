import type { QuranEdition } from '../../types/quran';

/**
 * Page arithmetic for the mushaf.
 *
 * The CDN names scans `001.png` … `604.png`, and every navigation action has to
 * clamp to the edition's own range (Warsh starts at page 4, MedinaOld ends at
 * 605). Both rules lived inline in the web provider; keeping them pure here is
 * what makes them testable without a reader.
 */

/** `1` → `"001"`, the zero-padded file name used by every edition. */
export function formatPageNumber(page: number): string {
  return String(page).padStart(3, '0');
}

type PageRange = Pick<QuranEdition, 'firstPage' | 'lastPage'>;

export function isPageInEdition(edition: PageRange, page: number): boolean {
  return (
    Number.isInteger(page) &&
    page >= edition.firstPage &&
    page <= edition.lastPage
  );
}

/**
 * The nearest page the edition actually has.
 *
 * Non-finite input is a deep-link bug, not a page: it resolves to the first page
 * rather than `NaN`, which would poison every later comparison.
 */
export function clampPageToEdition(edition: PageRange, page: number): number {
  if (!Number.isFinite(page)) return edition.firstPage;

  return Math.min(edition.lastPage, Math.max(edition.firstPage, page));
}

/**
 * The scan for one page.
 *
 * The caller clamps first (`clampPageToEdition`): this only builds a URL, and a
 * silent clamp here would make a navigation bug look like a 404 from the CDN.
 */
export function quranPageImageUrl(
  edition: Pick<QuranEdition, 'baseUrl'>,
  page: number,
): string {
  const base = edition.baseUrl.replace(/\/+$/, '');

  return `${base}/pages/${formatPageNumber(page)}.png`;
}
