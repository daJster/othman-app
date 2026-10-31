import type {
  ContentBody,
  ContentDirection,
  ContentSource,
  SurahInfoSection,
} from '../../types/quran';
import { QuranDataError } from './errors';

/**
 * Boundary parsing for the ayah content sources (P6.3).
 *
 * The quranpedia API is untyped JSON with three different shapes behind one
 * provider: an option list, a book body, and surah information. Each is parsed
 * here so the service and panel receive typed values, and so a malformed or
 * oversized response becomes one retryable error instead of a half-rendered
 * panel.
 *
 * Two rules matter for correctness:
 *
 *  - **Payloads are bounded.** Tafsir books can be enormous. `MAX_CONTENT_CHARS`
 *    is a named cap enforced on the *joined* text, and `MAX_CONTENT_PARTS`
 *    bounds the number of book parts. Exceeding either rejects the payload
 *    rather than rendering an unbounded response.
 *  - **Empty is not an error.** A source can legitimately have no text for an
 *    ayah. That stays a distinct `empty` result, never `text: ''`, so a panel
 *    cannot present "nothing" as a successful fetch.
 */

/** Maximum joined text length for one source body, in characters. */
export const MAX_CONTENT_CHARS = 120_000;

/** Maximum number of content entries accepted from one book response. */
export const MAX_CONTENT_PARTS = 200;

/** A source body that is larger than the documented cap. */
export class ContentTooLargeError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(`[quran:content-body] ${detail}`);
    this.name = 'ContentTooLargeError';
    this.detail = detail;
  }
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(
  value: unknown,
  source: 'content-sources' | 'content-body' | 'surah-info',
  path: string,
): JsonObject {
  if (!isObject(value)) {
    throw new QuranDataError(source, `${path} must be an object`);
  }

  return value;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const key = String(entity).toLowerCase();

    if (key.startsWith('#x')) {
      const code = Number.parseInt(key.slice(2), 16);

      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    if (key.startsWith('#')) {
      const code = Number.parseInt(key.slice(1), 10);

      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    return NAMED_ENTITIES[key] ?? match;
  });
}

/**
 * Converts the provider's HTML fragments to text RN can render.
 *
 * `<br>` becomes a line break and block closers become paragraph breaks; all
 * other tags are removed. Entities are decoded *after* tags are stripped, so a
 * `&lt;span&gt;` in the source text cannot become a tag that the next step
 * treats as markup.
 */
export function toPlainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n\n')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function assertBounded(text: string, source: string): void {
  if (text.length > MAX_CONTENT_CHARS) {
    throw new ContentTooLargeError(
      `${source} is ${text.length} characters, above the ${MAX_CONTENT_CHARS} cap`,
    );
  }
}

/**
 * `/ayah/{surah}/{ayah}/{type}` → the books available for that type.
 *
 * Every row is required to carry a positive id and a name: offering a source
 * that cannot be requested is worse than failing the list and letting the
 * reader retry.
 */
export function parseContentSources(raw: unknown): ContentSource[] {
  if (!Array.isArray(raw)) {
    throw new QuranDataError('content-sources', 'payload must be an array');
  }

  const seen = new Set<number>();
  const sources: ContentSource[] = [];

  raw.forEach((value, index) => {
    const path = `payload[${index}]`;
    const row = object(value, 'content-sources', path);
    const id = row.id;

    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
      throw new QuranDataError(
        'content-sources',
        `${path}.id must be a positive integer`,
      );
    }

    if (!nonEmptyString(row.name)) {
      throw new QuranDataError(
        'content-sources',
        `${path}.name must be a non-empty string`,
      );
    }

    // Duplicate ids would produce duplicate React keys and an ambiguous picker.
    if (seen.has(id)) return;
    seen.add(id);

    const category = isObject(row.category) ? row.category.name : null;

    sources.push({
      id,
      name: row.name.trim(),
      author: nonEmptyString(row.author) ? row.author.trim() : null,
      category: nonEmptyString(category) ? category.trim() : null,
    });
  });

  return sources;
}

/**
 * `/ayah/{surah}/{ayah}/book/{id}` → the book's text.
 *
 * `book.language.direction` decides the block direction: an English translation
 * stays LTR inside an Arabic reader, and Arabic tafsir stays RTL inside an
 * English one.
 */
export function parseBookContent(raw: unknown): ContentBody {
  const payload = object(raw, 'content-body', 'payload');
  const book = isObject(payload.book) ? payload.book : null;
  const language = book && isObject(book.language) ? book.language : null;
  const direction: ContentDirection =
    language?.direction === 'ltr' ? 'ltr' : 'rtl';

  if (!Array.isArray(payload.content)) {
    throw new QuranDataError(
      'content-body',
      'payload.content must be an array',
    );
  }

  if (payload.content.length > MAX_CONTENT_PARTS) {
    throw new ContentTooLargeError(
      `payload has ${payload.content.length} parts, above the ${MAX_CONTENT_PARTS} cap`,
    );
  }

  const text = payload.content
    .map((part, index) => {
      const row = object(part, 'content-body', `payload.content[${index}]`);

      return typeof row.text === 'string' ? toPlainText(row.text) : '';
    })
    .filter((part) => part.length > 0)
    .join('\n\n');

  assertBounded(text, 'content text');

  if (text.length === 0) return { status: 'empty', direction };

  return { status: 'ready', text, direction };
}

function sectionText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return toPlainText(String(value));
  }

  if (Array.isArray(value)) {
    return value
      .map((row) => {
        if (!isObject(row)) return '';

        const title = typeof row.title === 'string' ? row.title.trim() : '';
        const text =
          typeof row.value === 'string' || typeof row.value === 'number'
            ? String(row.value)
            : '';

        return [title, text].filter((part) => part.length > 0).join(': ');
      })
      .filter((part) => part.length > 0)
      .join('\n');
  }

  return '';
}

/**
 * `/surah/information/{surah}` → titled sections.
 *
 * The provider returns an object of `{title, value}` pairs. A value may be a
 * string, a number (ayah/word counts) or an array of `{title, value}` rows
 * (per-riwaya counts), so all three are flattened here. Unknown entries are
 * skipped rather than rejected: the endpoint carries decorative fields, and a
 * missing section is not a broken panel.
 */
export function parseSurahInformation(raw: unknown): SurahInfoSection[] {
  const payload = object(raw, 'surah-info', 'payload');
  const sections: SurahInfoSection[] = [];

  Object.entries(payload).forEach(([key, value]) => {
    if (!isObject(value)) return;

    const title = value.title;

    if (!nonEmptyString(title)) return;

    const text = sectionText(value.value);
    if (text.length === 0) return;

    sections.push({ key, title: title.trim(), text });
  });

  const joined = sections.map((section) => section.text).join('\n\n');
  assertBounded(joined, 'surah information');

  return sections;
}
