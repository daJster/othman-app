import type {
  AyahContent,
  EditionBboxes,
  QuranEdition,
  SurahMetadata,
} from '@/core/types';
import { createQuranService } from '@/services/quran/quran.service';
import type { QuranRepositories } from '@/services/quran/quran.types';

/**
 * The service is pure orchestration, so it is tested with deferred fakes: the
 * claim under test is *ordering* ("both requests are in flight before either
 * resolves"), which a resolved-promise fake cannot distinguish from a
 * waterfall.
 */

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const EDITION: QuranEdition = {
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
};

const BBOXES: EditionBboxes = {
  bySurah: {},
  byPage: {},
};

const AYAH: AyahContent = {
  absoluteNumber: 1,
  text: 'بِسْمِ اللَّهِ',
  numberInSurah: 1,
  juz: 1,
  manzil: 1,
  page: 1,
  ruku: 1,
  hizbQuarter: 1,
  sajda: false,
};

function emptyRepositories(): QuranRepositories {
  return {
    editions: { list: jest.fn() },
    metadata: { list: jest.fn() },
    bboxes: { load: jest.fn() },
    content: { byAbsoluteNumber: jest.fn() },
  };
}

describe('loadCatalog', () => {
  it('starts both requests before waiting for either', async () => {
    const editions = deferred<Record<string, QuranEdition>>();
    const metadata = deferred<Record<string, SurahMetadata>>();
    const listEditions = jest.fn(() => editions.promise);
    const listMetadata = jest.fn(() => metadata.promise);
    const repos = emptyRepositories();
    repos.editions = { list: listEditions };
    repos.metadata = { list: listMetadata };
    const service = createQuranService(repos);

    const pending = service.loadCatalog();

    // A waterfall would leave `listMetadata` uncalled until `editions` resolves.
    expect(listEditions).toHaveBeenCalledTimes(1);
    expect(listMetadata).toHaveBeenCalledTimes(1);

    editions.resolve({ '1': EDITION });
    metadata.resolve({});

    await expect(pending).resolves.toEqual({
      editions: { '1': EDITION },
      surahs: {},
    });
  });

  it('fails the whole catalog when either payload fails', async () => {
    const repos = emptyRepositories();
    repos.editions = { list: () => Promise.resolve({}) };
    repos.metadata = { list: () => Promise.reject(new Error('offline')) };

    await expect(createQuranService(repos).loadCatalog()).rejects.toThrow(
      'offline',
    );
  });
});

describe('reader reads', () => {
  it('loads the bbox tables for the edition it was given', async () => {
    const loadBboxes = jest.fn().mockResolvedValue(BBOXES);
    const repos = emptyRepositories();
    repos.bboxes = { load: loadBboxes };

    await expect(createQuranService(repos).loadBboxes(EDITION)).resolves.toBe(
      BBOXES,
    );
    expect(loadBboxes).toHaveBeenCalledWith(EDITION);
  });

  it('loads one ayah by absolute number', async () => {
    const loadAyah = jest.fn().mockResolvedValue(AYAH);
    const repos = emptyRepositories();
    repos.content = { byAbsoluteNumber: loadAyah };

    await expect(createQuranService(repos).loadAyah(1)).resolves.toBe(AYAH);
    expect(loadAyah).toHaveBeenCalledWith(1);
  });
});
