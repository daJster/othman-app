import { QuranDataError } from '../errors';
import {
  ContentTooLargeError,
  MAX_CONTENT_CHARS,
  MAX_CONTENT_PARTS,
  parseBookContent,
  parseContentSources,
  parseSurahInformation,
  toPlainText,
} from '../tafsir';

/**
 * Content-source boundary parsing.
 *
 * The provider mixes three payload shapes and sends HTML fragments inside the
 * text. These cases pin the three promises the panel depends on: sources are
 * typed and deduplicated, bodies are plain text with a direction, and an empty
 * body stays distinct from a successful one.
 */
describe('parseContentSources', () => {
  it('parses, trims and deduplicates source rows', () => {
    const sources = parseContentSources([
      {
        id: 3,
        name: '  تيسير الكريم الرحمن ',
        author: ' السعدي ',
        category: { id: 3, name: ' كتب التفسير ' },
      },
      { id: 3, name: 'duplicate id' },
      { id: 4, name: 'جامع البيان', author: null, category: null },
    ]);

    expect(sources).toEqual([
      {
        id: 3,
        name: 'تيسير الكريم الرحمن',
        author: 'السعدي',
        category: 'كتب التفسير',
      },
      { id: 4, name: 'جامع البيان', author: null, category: null },
    ]);
  });

  it('accepts an empty list as a legitimate result', () => {
    expect(parseContentSources([])).toEqual([]);
  });

  it.each([
    ['a non-array payload', { id: 1 }],
    ['a missing id', [{ name: 'book' }]],
    ['a non-positive id', [{ id: 0, name: 'book' }]],
    ['a missing name', [{ id: 1 }]],
    ['a blank name', [{ id: 1, name: '   ' }]],
  ])('rejects %s', (_label, payload) => {
    expect(() => parseContentSources(payload)).toThrow(QuranDataError);
  });
});

describe('parseBookContent', () => {
  it('joins parts, strips HTML and takes direction from the book language', () => {
    const body = parseBookContent({
      book: { language: { direction: 'ltr' } },
      content: [
        { text: '<span class="x">First</span><br />line &amp; more' },
        { text: '<p>Second</p><p>paragraph</p>' },
      ],
    });

    expect(body).toEqual({
      status: 'ready',
      direction: 'ltr',
      text: 'First\nline & more\n\nSecond\n\nparagraph',
    });
  });

  it('defaults to rtl when the language is absent', () => {
    const body = parseBookContent({
      content: [{ text: 'نص عربي' }],
    });

    expect(body).toMatchObject({ status: 'ready', direction: 'rtl' });
  });

  it('treats an empty book body as empty, not as successful text', () => {
    expect(
      parseBookContent({
        book: { language: { direction: 'rtl' } },
        content: [],
      }),
    ).toEqual({ status: 'empty', direction: 'rtl' });
  });

  it('treats parts with no text as empty', () => {
    expect(
      parseBookContent({ content: [{ text: '  ' }, { text: null }] }),
    ).toEqual({ status: 'empty', direction: 'rtl' });
  });

  it('rejects a malformed content envelope', () => {
    expect(() => parseBookContent({ content: 'text' })).toThrow(QuranDataError);
    expect(() => parseBookContent(null)).toThrow(QuranDataError);
  });

  it('rejects more parts than the documented cap', () => {
    const content = Array.from({ length: MAX_CONTENT_PARTS + 1 }, () => ({
      text: 'x',
    }));

    expect(() => parseBookContent({ content })).toThrow(ContentTooLargeError);
  });

  it('rejects text above the documented character cap', () => {
    expect(() =>
      parseBookContent({
        content: [{ text: 'x'.repeat(MAX_CONTENT_CHARS + 1) }],
      }),
    ).toThrow(ContentTooLargeError);
  });
});

describe('parseSurahInformation', () => {
  it('returns titled sections and drops decorative or empty entries', () => {
    const sections = parseSurahInformation({
      introduction: { title: 'نبذة', value: '<p>سورة البقرة</p>' },
      surah_type: { title: 'نوعها', value: 'مدنية' },
      empty: { title: 'فارغ', value: '   ' },
      invalid: { title: '', value: 'x' },
      notAnObject: 'x',
    });

    expect(sections).toEqual([
      { key: 'introduction', title: 'نبذة', text: 'سورة البقرة' },
      { key: 'surah_type', title: 'نوعها', text: 'مدنية' },
    ]);
  });

  it('rejects a non-object payload', () => {
    expect(() => parseSurahInformation([])).toThrow(QuranDataError);
  });
});

describe('toPlainText', () => {
  it('decodes entities after stripping tags', () => {
    expect(toPlainText('&lt;span&gt;x&lt;/span&gt; &amp; y')).toBe(
      '<span>x</span> & y',
    );
  });

  it('normalises spaces and excess blank lines', () => {
    expect(toPlainText('a  b\n\n\n\nc   d')).toBe('a b\n\nc d');
  });
});
