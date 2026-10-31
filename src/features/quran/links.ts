import { WEBSITE_URL } from '@/core/config';
import { clampPageToEdition } from '@/core/domain/quran/page';
import { isAyahInSurah, isSurahNumber } from '@/core/domain/quran/surah';
import type { EditionBboxes, QuranEdition } from '@/core/types';

/**
 * Canonical reader links.
 *
 * Native and web accept the same three parameters — `page`, `surah`, `ayah` —
 * but on different routes: `othman://quran?…` opens the app, `/quran?…` opens
 * the web tab. One parser and one builder serve both, so a link the app shares
 * is exactly the link it can read back (P5.6).
 *
 * Parameters are validated, not coerced. `page=abc` is not page 1: silently
 * repairing it would make a broken link look like a working one. The caller
 * turns `invalid` into a recoverable screen.
 *
 * `page` and `surah`/`ayah` may both be present. They are kept as-is here;
 * `resolveQuranLink` is what decides that the ayah mapping wins.
 */

export type QuranLinkParams = Readonly<
  Record<string, string | string[] | undefined>
>;

export type QuranLinkPosition = {
  page: number | null;
  surah: number | null;
  ayah: number | null;
};

export type QuranLinkParse =
  | { kind: 'empty' }
  | {
      kind: 'invalid';
      param: 'page' | 'surah' | 'ayah';
      reason: 'duplicate' | 'malformed' | 'conflict';
    }
  | ({ kind: 'link' } & QuranLinkPosition);

type RawParam =
  | { status: 'missing' }
  | { status: 'duplicate' }
  | { status: 'value'; value: string };

function readParam(params: QuranLinkParams, name: string): RawParam {
  const raw = params[name];

  if (raw === undefined) return { status: 'missing' };
  // A route can receive `?page=1&page=2`. Keeping one of them would make the
  // destination depend on the framework's coercion order.
  if (Array.isArray(raw)) return { status: 'duplicate' };

  return { status: 'value', value: raw };
}

/** Digits only: `12.4`, `-1`, `1e3`, `""` and `" "` are malformed, not 0. */
function parseDigits(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  return Number(value);
}

/**
 * Parse the route's query/params.
 *
 * Rules:
 *
 *  - all three missing → `empty` (plain entry, restore the saved position);
 *  - any duplicated parameter → `invalid` (ambiguous link);
 *  - `page` is any non-negative integer and is clamped later by the edition;
 *  - `surah` must be 1–114 and `ayah` 1–286;
 *  - `ayah` without `surah` → `invalid` (an ayah number alone is not unique);
 *  - `surah` without `ayah` is valid and means ayah 1.
 */
export function parseQuranLink(params: QuranLinkParams): QuranLinkParse {
  const page = readParam(params, 'page');
  const surah = readParam(params, 'surah');
  const ayah = readParam(params, 'ayah');

  if (
    page.status === 'duplicate' ||
    surah.status === 'duplicate' ||
    ayah.status === 'duplicate'
  ) {
    const param =
      page.status === 'duplicate'
        ? 'page'
        : surah.status === 'duplicate'
          ? 'surah'
          : 'ayah';

    return { kind: 'invalid', param, reason: 'duplicate' };
  }

  if (
    page.status === 'missing' &&
    surah.status === 'missing' &&
    ayah.status === 'missing'
  ) {
    return { kind: 'empty' };
  }

  let parsedPage: number | null = null;
  if (page.status === 'value') {
    parsedPage = parseDigits(page.value);

    if (parsedPage === null) {
      return { kind: 'invalid', param: 'page', reason: 'malformed' };
    }
  }

  let parsedSurah: number | null = null;
  if (surah.status === 'value') {
    parsedSurah = parseDigits(surah.value);

    if (parsedSurah === null || !isSurahNumber(parsedSurah)) {
      return { kind: 'invalid', param: 'surah', reason: 'malformed' };
    }
  }

  let parsedAyah: number | null = null;
  if (ayah.status === 'value') {
    parsedAyah = parseDigits(ayah.value);

    if (parsedAyah === null || !isAyahInSurah(parsedAyah)) {
      return { kind: 'invalid', param: 'ayah', reason: 'malformed' };
    }

    if (parsedSurah === null) {
      return { kind: 'invalid', param: 'ayah', reason: 'conflict' };
    }
  }

  return {
    kind: 'link',
    page: parsedPage,
    surah: parsedSurah,
    ayah: parsedAyah,
  };
}

/**
 * The query string for a position, without a leading `?`.
 *
 * A builder rejects invalid input instead of emitting a link that the parser
 * would then refuse: sharing a page-0 or surah-500 URL is a programming error,
 * not something to paper over with a clamp.
 */
function positionQuery(position: QuranLinkPosition): string {
  const params = new URLSearchParams();

  if (position.page !== null) {
    if (!Number.isInteger(position.page) || position.page < 0) {
      throw new RangeError(`Invalid page in Quran link: ${position.page}`);
    }

    params.set('page', String(position.page));
  }

  if (position.surah !== null) {
    if (!isSurahNumber(position.surah)) {
      throw new RangeError(`Invalid surah in Quran link: ${position.surah}`);
    }

    params.set('surah', String(position.surah));

    if (position.ayah !== null) {
      if (!isAyahInSurah(position.ayah)) {
        throw new RangeError(`Invalid ayah in Quran link: ${position.ayah}`);
      }

      params.set('ayah', String(position.ayah));
    }
  } else if (position.ayah !== null) {
    throw new RangeError('Cannot build a Quran link with an ayah but no surah');
  }

  return params.toString();
}

/** `/quran?page=…&surah=…&ayah=…` — the web route. */
export function buildQuranWebPath(position: QuranLinkPosition): string {
  const query = positionQuery(position);

  return query ? `/quran?${query}` : '/quran';
}

/** `othman://quran?…` — the native route. */
export function buildQuranAppLink(position: QuranLinkPosition): string {
  const query = positionQuery(position);

  return query ? `othman://quran?${query}` : 'othman://quran';
}

/** A public web URL suitable for sharing, built from the same query. */
export function buildQuranShareUrl(position: QuranLinkPosition): string {
  const query = positionQuery(position);
  const base = `${WEBSITE_URL.replace(/\/+$/, '')}/quran`;

  return query ? `${base}?${query}` : base;
}

export type QuranLinkResolution =
  | { kind: 'page'; page: number }
  | { kind: 'ayah'; surah: number; ayah: number; page: number }
  | { kind: 'invalid'; param: 'page' | 'surah' | 'ayah' };

/**
 * Resolve a parsed link against the attached edition.
 *
 * An ayah link is authoritative: the edition's `bySurah` table says which page
 * that ayah starts on, so a contradictory `page` is ignored rather than
 * averaged (the spec's "ayah mapping takes precedence"). A surah/ayah pair the
 * table does not know is `invalid` — not silently page 1.
 *
 * A page-only link clamps into the edition's range, which is what makes Warsh
 * (starts at 4) and MedinaOld (ends at 605) behave.
 */
export function resolveQuranLink(
  link: Pick<QuranLinkPosition, 'page' | 'surah' | 'ayah'>,
  edition: Pick<QuranEdition, 'firstPage' | 'lastPage'>,
  bboxes: EditionBboxes,
): QuranLinkResolution {
  if (link.surah !== null) {
    if (!isSurahNumber(link.surah)) {
      return { kind: 'invalid', param: 'surah' };
    }

    const ayah = link.ayah ?? 1;
    if (!isAyahInSurah(ayah)) {
      return { kind: 'invalid', param: 'ayah' };
    }

    const row = bboxes.bySurah[String(link.surah)]?.[String(ayah)];
    if (!row) {
      return { kind: 'invalid', param: 'ayah' };
    }

    return {
      kind: 'ayah',
      surah: link.surah,
      ayah,
      page: clampPageToEdition(edition, row.pageNumber),
    };
  }

  if (link.page !== null) {
    return { kind: 'page', page: clampPageToEdition(edition, link.page) };
  }

  return { kind: 'invalid', param: 'page' };
}
