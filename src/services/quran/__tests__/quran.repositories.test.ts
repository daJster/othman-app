import {
  QURAN_EDITIONS_URL,
  QURAN_METADATA_URL,
  quranAyahUrl,
} from '@/core/config';
import { QuranDataError } from '@/core/domain/quran/errors';
import { parseEditions } from '@/core/domain/quran/parse';
import type { HttpClient } from '@/platform/http';
import { createBboxesRepository } from '@/services/quran/bboxes.repository';
import { createAyahContentRepository } from '@/services/quran/content.repository';
import { createEditionsRepository } from '@/services/quran/editions.repository';
import { createMetadataRepository } from '@/services/quran/metadata.repository';
import ayahFixture from '../__fixtures__/ayah-content.json';
import editionsFixture from '../__fixtures__/editions.json';
import pageBboxesFixture from '../__fixtures__/page-bboxes.json';
import surahBboxesFixture from '../__fixtures__/surah-bboxes.json';
import metadataFixture from '../__fixtures__/surah-metadata.json';

/**
 * The real payloads, trimmed to two pages where size matters.
 *
 * A repository test that hand-writes a "valid" payload can only prove the parser
 * agrees with the test author. These fixtures are copies of what the CDN and
 * the API actually returned, so the happy path is evidence that the parser
 * agrees with the world.
 */

const EDITION = parseEditions(editionsFixture)['1'];

function clientFor(responses: Record<string, unknown>) {
  const get = jest.fn(async (url: string) => {
    if (!(url in responses)) {
      throw new Error(`Unexpected request: ${url}`);
    }

    return responses[url];
  });

  return { client: { get } as unknown as HttpClient, get };
}

describe('createEditionsRepository', () => {
  it('requests editions.json and returns typed editions', async () => {
    const { client, get } = clientFor({
      [QURAN_EDITIONS_URL]: editionsFixture,
    });

    const editions = await createEditionsRepository(client).list();

    expect(get).toHaveBeenCalledWith(QURAN_EDITIONS_URL);
    expect(Object.keys(editions)).toEqual(['1', '2']);
    expect(editions['1']).toMatchObject({
      key: '1',
      name: 'Tajweed',
      firstPage: 1,
      lastPage: 604,
    });
  });

  it('rejects a malformed payload with the source attached', async () => {
    const { client } = clientFor({ [QURAN_EDITIONS_URL]: {} });

    await expect(createEditionsRepository(client).list()).rejects.toMatchObject(
      { name: 'QuranDataError', source: 'editions' },
    );
  });
});

describe('createMetadataRepository', () => {
  it('requests quran.json and returns all 114 surahs', async () => {
    const { client, get } = clientFor({
      [QURAN_METADATA_URL]: metadataFixture,
    });

    const surahs = await createMetadataRepository(client).list();

    expect(get).toHaveBeenCalledWith(QURAN_METADATA_URL);
    expect(Object.keys(surahs)).toHaveLength(114);
    expect(surahs['1']).toMatchObject({
      number: 1,
      nameEnglish: 'Al-Fatiha',
      location: 'makka',
      ayahCount: 7,
    });
  });

  it('rejects a table that lost a surah', async () => {
    const { client } = clientFor({
      [QURAN_METADATA_URL]: { '1': metadataFixture['1'] },
    });

    await expect(
      createMetadataRepository(client).list(),
    ).rejects.toBeInstanceOf(QuranDataError);
  });
});

describe('createBboxesRepository', () => {
  it('requests both normalised tables and indexes them by surah and page', async () => {
    const { client, get } = clientFor({
      [EDITION.bboxNormUrl]: surahBboxesFixture,
      [EDITION.bboxReversedNormUrl]: pageBboxesFixture,
    });

    const bboxes = await createBboxesRepository(client).load(EDITION);

    expect(get).toHaveBeenCalledWith(EDITION.bboxNormUrl);
    expect(get).toHaveBeenCalledWith(EDITION.bboxReversedNormUrl);
    expect(Object.keys(bboxes.bySurah)).toEqual(['1', '2']);
    expect(bboxes.bySurah['1']['1'].pageNumber).toBe(1);
    expect(bboxes.byPage['2']['1']).toMatchObject({
      absoluteNumber: 8,
      surahNumber: 2,
    });
  });

  it('starts both requests before waiting for either', async () => {
    const get = jest.fn(() => new Promise<never>(() => {}));
    const repository = createBboxesRepository({
      get,
    } as unknown as HttpClient);

    void repository.load(EDITION);

    // A waterfall would request the second file only after the first resolved.
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith(EDITION.bboxNormUrl);
    expect(get).toHaveBeenCalledWith(EDITION.bboxReversedNormUrl);
  });

  it('rejects an empty bbox payload', async () => {
    const { client } = clientFor({
      [EDITION.bboxNormUrl]: { surahs: {} },
      [EDITION.bboxReversedNormUrl]: pageBboxesFixture,
    });

    await expect(
      createBboxesRepository(client).load(EDITION),
    ).rejects.toMatchObject({ source: 'surah-bboxes' });
  });
});

describe('createAyahContentRepository', () => {
  it('requests the ayah by absolute number', async () => {
    const { client, get } = clientFor({ [quranAyahUrl(1)]: ayahFixture });

    const ayah = await createAyahContentRepository(client).byAbsoluteNumber(1);

    expect(get).toHaveBeenCalledWith(quranAyahUrl(1));
    expect(ayah).toMatchObject({
      absoluteNumber: 1,
      numberInSurah: 1,
      juz: 1,
      sajda: false,
    });
    expect(ayah.text.length).toBeGreaterThan(0);
  });

  it('rejects an API error body', async () => {
    const { client } = clientFor({
      [quranAyahUrl(1)]: { code: 404, status: 'NOT_FOUND', data: null },
    });

    await expect(
      createAyahContentRepository(client).byAbsoluteNumber(1),
    ).rejects.toMatchObject({ source: 'ayah-content' });
  });
});
