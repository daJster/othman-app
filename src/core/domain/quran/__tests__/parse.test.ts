import { QuranDataError } from '@/core/domain/quran/errors';
import {
  parseAyahContent,
  parseEditionBboxes,
  parseEditions,
  parsePageBboxes,
  parseSurahBboxes,
  parseSurahMetadata,
} from '@/core/domain/quran/parse';
import { SURAH_COUNT } from '@/core/domain/quran/surah';

/**
 * The parsers are the app's only defence against a bad CDN payload, so the
 * tests are written the same way: a valid baseline, then one broken field at a
 * time. Every rejection must name the file it came from (`source`), because
 * that is what a crash report needs to be actionable.
 */

type EditionRow = ReturnType<typeof editionRow>;
type RawBbox = { top: number; left: number; bottom: number; right: number };
type RawSurahAyah = {
  absolute_number: number;
  page_num: number;
  bboxes: RawBbox[];
};
type RawPageAyah = {
  absolute_number: number;
  surah: number;
  bboxes: RawBbox[];
};
type RawSurahMetadata = {
  name: string;
  name_en: string;
  location: string;
  number_of_ayat: number;
};

function editionRow(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Tajweed',
    riwaya: 'hafs',
    base_url: 'https://cdn.test/Tajweed',
    bbox_url: 'https://cdn.test/Tajweed/bbox.json',
    bbox_reversed_url: 'https://cdn.test/Tajweed/bbox_reversed.json',
    bbox_norm_url: 'https://cdn.test/Tajweed/bbox_norm.json',
    bbox_reversed_norm_url: 'https://cdn.test/Tajweed/bbox_reversed_norm.json',
    first_page: 1,
    last_page: 604,
    theme_color: '#FFFFD7',
    ...overrides,
  };
}

function editionsPayload(rows: EditionRow[] = [editionRow()]) {
  return Object.fromEntries(rows.map((row, index) => [String(index + 1), row]));
}

function metadataPayload(): Record<string, RawSurahMetadata> {
  const surahs: Record<string, RawSurahMetadata> = {};

  for (let number = 1; number <= SURAH_COUNT; number += 1) {
    surahs[number] = {
      name: 'سورة',
      name_en: `Surah ${number}`,
      location: number === 9 ? 'madina' : 'makka',
      number_of_ayat: 3,
    };
  }

  return surahs;
}

const EDITION = { firstPage: 1, lastPage: 604 };

function surahBboxesPayload(): {
  surahs: Record<string, { ayat: Record<string, RawSurahAyah> }>;
} {
  return {
    surahs: {
      '1': {
        ayat: {
          '1': {
            absolute_number: 1,
            page_num: 1,
            bboxes: [{ top: 0.2, left: 0.1, bottom: 0.3, right: 0.9 }],
          },
        },
      },
    },
  };
}

function pageBboxesPayload(): Record<
  string,
  { ayat: Record<string, RawPageAyah> }
> {
  return {
    '1': {
      ayat: {
        '1': {
          absolute_number: 1,
          surah: 1,
          bboxes: [{ top: 0.2, left: 0.1, bottom: 0.3, right: 0.9 }],
        },
      },
    },
  };
}

function ayahPayload(overrides: Record<string, unknown> = {}) {
  return {
    code: 200,
    status: 'OK',
    data: {
      number: 1,
      text: 'بِسْمِ اللَّهِ',
      numberInSurah: 1,
      juz: 1,
      manzil: 1,
      page: 1,
      ruku: 1,
      hizbQuarter: 1,
      sajda: false,
      ...overrides,
    },
  };
}

function expectRejection(run: () => unknown, source: string) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(QuranDataError);
    expect((error as QuranDataError).source).toBe(source);

    return;
  }

  throw new Error(`Expected a QuranDataError from ${source}`);
}

describe('parseEditions', () => {
  it('maps the CDN spelling to the typed edition', () => {
    const editions = parseEditions(editionsPayload());

    expect(editions['1']).toEqual({
      key: '1',
      name: 'Tajweed',
      riwaya: 'hafs',
      baseUrl: 'https://cdn.test/Tajweed',
      bboxUrl: 'https://cdn.test/Tajweed/bbox.json',
      bboxReversedUrl: 'https://cdn.test/Tajweed/bbox_reversed.json',
      bboxNormUrl: 'https://cdn.test/Tajweed/bbox_norm.json',
      bboxReversedNormUrl: 'https://cdn.test/Tajweed/bbox_reversed_norm.json',
      firstPage: 1,
      lastPage: 604,
      themeColor: '#FFFFD7',
    });
  });

  it('keeps every edition, keyed by its numeric key', () => {
    const editions = parseEditions(
      editionsPayload([
        editionRow(),
        editionRow({ name: 'Warsh1', riwaya: 'warsh', first_page: 4 }),
      ]),
    );

    expect(Object.keys(editions)).toEqual(['1', '2']);
    expect(editions['2'].name).toBe('Warsh1');
    expect(editions['2'].firstPage).toBe(4);
  });

  it('rejects a payload with no editions', () => {
    expectRejection(() => parseEditions({}), 'editions');
  });

  it('rejects a payload that is not an object', () => {
    expectRejection(() => parseEditions([]), 'editions');
    expectRejection(() => parseEditions(null), 'editions');
  });

  it('rejects a non-numeric edition key', () => {
    expectRejection(() => parseEditions({ tajweed: editionRow() }), 'editions');
  });

  it('rejects a page range that runs backwards', () => {
    expectRejection(
      () =>
        parseEditions(
          editionsPayload([editionRow({ first_page: 500, last_page: 100 })]),
        ),
      'editions',
    );
  });

  it('rejects an edition whose scans are not https', () => {
    expectRejection(
      () =>
        parseEditions(
          editionsPayload([
            editionRow({ base_url: 'http://cdn.test/Tajweed' }),
          ]),
        ),
      'editions',
    );
  });

  it('rejects a theme colour that is not #RRGGBB', () => {
    expectRejection(
      () =>
        parseEditions(editionsPayload([editionRow({ theme_color: 'cream' })])),
      'editions',
    );
  });
});

describe('parseSurahMetadata', () => {
  it('keys every surah by number and adds the number as a field', () => {
    const surahs = parseSurahMetadata(metadataPayload());

    expect(Object.keys(surahs)).toHaveLength(SURAH_COUNT);
    expect(surahs['1']).toEqual({
      number: 1,
      name: 'سورة',
      nameEnglish: 'Surah 1',
      location: 'makka',
      ayahCount: 3,
    });
    expect(surahs['9'].location).toBe('madina');
  });

  it('rejects a table with a missing surah', () => {
    const payload = metadataPayload();
    delete payload['114'];

    expectRejection(() => parseSurahMetadata(payload), 'surah-metadata');
  });

  it('rejects a table with an extra surah instead of a missing one', () => {
    const payload = metadataPayload();
    delete payload['114'];
    payload['115'] = payload['1'];

    expectRejection(() => parseSurahMetadata(payload), 'surah-metadata');
  });

  it('rejects an unknown revelation place', () => {
    const payload = metadataPayload();
    payload['1'].location = 'jerusalem';

    expectRejection(() => parseSurahMetadata(payload), 'surah-metadata');
  });

  it('rejects an impossible ayah count', () => {
    const payload = metadataPayload();
    payload['1'].number_of_ayat = 0;

    expectRejection(() => parseSurahMetadata(payload), 'surah-metadata');
  });
});

describe('parseSurahBboxes', () => {
  it('keeps the page and the normalised rectangles', () => {
    const table = parseSurahBboxes(surahBboxesPayload(), EDITION);

    expect(table['1']['1']).toEqual({
      absoluteNumber: 1,
      pageNumber: 1,
      bboxes: [{ top: 0.2, left: 0.1, bottom: 0.3, right: 0.9 }],
    });
  });

  it('rejects a page the edition does not have', () => {
    const payload = surahBboxesPayload();
    payload.surahs['1'].ayat['1'].page_num = 605;

    expectRejection(() => parseSurahBboxes(payload, EDITION), 'surah-bboxes');
  });

  it('rejects an ayah with no rectangles', () => {
    const payload = surahBboxesPayload();
    payload.surahs['1'].ayat['1'].bboxes = [];

    expectRejection(() => parseSurahBboxes(payload, EDITION), 'surah-bboxes');
  });

  it('rejects a rectangle outside the page', () => {
    const payload = surahBboxesPayload();
    payload.surahs['1'].ayat['1'].bboxes[0].right = 1.2;

    expectRejection(() => parseSurahBboxes(payload, EDITION), 'surah-bboxes');
  });

  it('drops a degenerate rectangle instead of failing the edition', () => {
    const payload = surahBboxesPayload();
    payload.surahs['1'].ayat['1'].bboxes[0].right = payload.surahs['1'].ayat['1']
      .bboxes[0].left;

    const table = parseSurahBboxes(payload, EDITION);

    // The CDN's live Tajweed payload contains one such box (8:52). Dropping it
    // keeps every other ayah usable; clamping would select the wrong words.
    expect(table['1']['1'].bboxes).toEqual([]);
  });

  it('keeps valid rectangles when a sibling is degenerate', () => {
    const payload = surahBboxesPayload();
    payload.surahs['1'].ayat['1'].bboxes = [
      { top: 0.2, left: 0.1, bottom: 0.3, right: 0.9 },
      { top: 0.4, left: 0.1, bottom: 0.4, right: 0.9 },
    ];

    const table = parseSurahBboxes(payload, EDITION);

    expect(table['1']['1'].bboxes).toEqual([
      { top: 0.2, left: 0.1, bottom: 0.3, right: 0.9 },
    ]);
  });

  it('rejects a surah key outside 1-114', () => {
    const payload = surahBboxesPayload();
    payload.surahs['115'] = payload.surahs['1'];

    expectRejection(() => parseSurahBboxes(payload, EDITION), 'surah-bboxes');
  });

  it('rejects a surah with no ayat', () => {
    const payload = surahBboxesPayload();
    payload.surahs['1'].ayat = {};

    expectRejection(() => parseSurahBboxes(payload, EDITION), 'surah-bboxes');
  });
});

describe('parsePageBboxes', () => {
  it('keeps the surah and the normalised rectangles', () => {
    const table = parsePageBboxes(pageBboxesPayload(), EDITION);

    expect(table['1']['1']).toEqual({
      absoluteNumber: 1,
      surahNumber: 1,
      bboxes: [{ top: 0.2, left: 0.1, bottom: 0.3, right: 0.9 }],
    });
  });

  it('rejects a page key outside the edition range', () => {
    const payload = pageBboxesPayload();
    payload['605'] = payload['1'];

    expectRejection(
      () => parsePageBboxes(payload, { firstPage: 1, lastPage: 604 }),
      'page-bboxes',
    );
  });

  it('rejects a surah outside 1-114', () => {
    const payload = pageBboxesPayload();
    payload['1'].ayat['1'].surah = 0;

    expectRejection(() => parsePageBboxes(payload, EDITION), 'page-bboxes');
  });

  it('rejects an ayah with no rectangles', () => {
    const payload = pageBboxesPayload();
    payload['1'].ayat['1'].bboxes = [];

    expectRejection(() => parsePageBboxes(payload, EDITION), 'page-bboxes');
  });
});

describe('parseEditionBboxes', () => {
  it('returns both indexes from one pair of payloads', () => {
    const bboxes = parseEditionBboxes(
      surahBboxesPayload(),
      pageBboxesPayload(),
      EDITION,
    );

    expect(Object.keys(bboxes.bySurah)).toEqual(['1']);
    expect(Object.keys(bboxes.byPage)).toEqual(['1']);
  });
});

describe('parseAyahContent', () => {
  it('reads the text and its position', () => {
    expect(parseAyahContent(ayahPayload())).toEqual({
      absoluteNumber: 1,
      text: 'بِسْمِ اللَّهِ',
      numberInSurah: 1,
      juz: 1,
      manzil: 1,
      page: 1,
      ruku: 1,
      hizbQuarter: 1,
      sajda: false,
    });
  });

  it('flattens the sajda object to a boolean', () => {
    const content = parseAyahContent(
      ayahPayload({ sajda: { id: 1, recommended: false, obligatory: true } }),
    );

    expect(content.sajda).toBe(true);
  });

  it('rejects an API error body', () => {
    expectRejection(
      () => parseAyahContent({ code: 404, status: 'NOT_FOUND', data: null }),
      'ayah-content',
    );
  });

  it('rejects an empty ayah', () => {
    expectRejection(
      () => parseAyahContent(ayahPayload({ text: '   ' })),
      'ayah-content',
    );
  });

  it('rejects an ayah number outside the surah', () => {
    expectRejection(
      () => parseAyahContent(ayahPayload({ numberInSurah: 287 })),
      'ayah-content',
    );
  });

  it('rejects a sajda flag that is neither boolean nor object', () => {
    expectRejection(
      () => parseAyahContent(ayahPayload({ sajda: 'yes' })),
      'ayah-content',
    );
  });
});
