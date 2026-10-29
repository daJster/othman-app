import type {
  Bbox,
  EditionBboxes,
  PageAyahBboxes,
  QuranEdition,
  SurahAyahBboxes,
} from '@/core/types';
import {
  createReaderStore,
  surahAtPage,
  type ReaderStore,
} from '@/features/quran/store/reader-store';
import {
  STORAGE_KEYS,
  type StorageKey,
  type StorageService,
} from '@/platform/storage';

/**
 * Reader store tests.
 *
 * The store is pure apart from the injected storage, so every rule is exercised
 * without a renderer: which page a jump lands on, which surah labels it, what
 * happens at the edges of an edition, and what survives a relaunch.
 *
 * The bbox fixture is deliberately unrealistic in one place: page 3 lists the
 * *next* surah's ayat first. That is the case the web reader got wrong (it took
 * the first key of the page map), and it is the only way to prove the page
 * label is derived from the smallest absolute number.
 */

const BOXES: Bbox[] = [{ top: 0.1, left: 0.1, bottom: 0.2, right: 0.9 }];

function pageRow(absoluteNumber: number, surahNumber: number): PageAyahBboxes {
  return { absoluteNumber, surahNumber, bboxes: BOXES };
}

function surahRow(absoluteNumber: number, pageNumber: number): SurahAyahBboxes {
  return { absoluteNumber, pageNumber, bboxes: BOXES };
}

/** Edition 1: pages 1–5, surahs 1→2 with a page that straddles both. */
const BBOXES: EditionBboxes = {
  byPage: {
    '1': { '1': pageRow(1, 1), '2': pageRow(2, 1) },
    '2': { '3': pageRow(3, 1), '4': pageRow(4, 1) },
    '3': {
      // The new surah comes first in insertion order; absolute numbers say the
      // page still starts in surah 1.
      '1': pageRow(8, 2),
      '2': pageRow(9, 2),
      '6': pageRow(6, 1),
      '7': pageRow(7, 1),
    },
    '4': { '3': pageRow(10, 2), '4': pageRow(11, 2) },
    '5': { '5': pageRow(12, 2) },
  },
  bySurah: {
    '1': {
      '1': surahRow(1, 1),
      '2': surahRow(2, 1),
      '3': surahRow(3, 2),
      '4': surahRow(4, 2),
      '6': surahRow(6, 3),
      '7': surahRow(7, 3),
    },
    '2': {
      '1': surahRow(8, 3),
      '2': surahRow(9, 3),
      '3': surahRow(10, 4),
      '4': surahRow(11, 4),
      '5': surahRow(12, 5),
    },
  },
};

/** Edition 2 starts at page 4 and ends at 605 (like MedinaOld). */
const BBOXES_2: EditionBboxes = {
  byPage: {
    '4': { '1': pageRow(8, 2) },
    '5': { '1': pageRow(10, 3) },
  },
  bySurah: {
    '2': { '1': surahRow(8, 4) },
    '3': { '1': surahRow(10, 5) },
  },
};

function edition(
  key: string,
  firstPage: number,
  lastPage: number,
): QuranEdition {
  return {
    key,
    name: `Edition ${key}`,
    riwaya: 'hafs',
    baseUrl: `https://cdn.test/${key}`,
    bboxUrl: `https://cdn.test/${key}/bbox.json`,
    bboxReversedUrl: `https://cdn.test/${key}/bbox_reversed.json`,
    bboxNormUrl: `https://cdn.test/${key}/bbox_norm.json`,
    bboxReversedNormUrl: `https://cdn.test/${key}/bbox_reversed_norm.json`,
    firstPage,
    lastPage,
    themeColor: '#FFFFD7',
  };
}

const EDITIONS: Record<string, QuranEdition> = {
  '1': edition('1', 1, 604),
  '2': edition('2', 4, 605),
};

type StoredValues = Partial<Record<StorageKey, unknown>>;

function fakeStorage(initial: StoredValues = {}) {
  const values = new Map<string, unknown>(Object.entries(initial));
  const reads: StorageKey[] = [];
  const writes: [StorageKey, unknown][] = [];

  const storage: StorageService = {
    async getItem<T>(key: StorageKey, fallback: T): Promise<T> {
      reads.push(key);

      return values.has(key) ? (values.get(key) as T) : fallback;
    },
    async setItem<T>(key: StorageKey, value: T): Promise<boolean> {
      values.set(key, value);
      writes.push([key, value]);

      return true;
    },
    async removeItem(key: StorageKey): Promise<boolean> {
      values.delete(key);

      return true;
    },
    async clear(): Promise<boolean> {
      values.clear();

      return true;
    },
  };

  return { storage, values, reads, writes };
}

/** A store that has finished booting on edition 1. */
async function mountedReader(
  initial: StoredValues = {},
): Promise<{ store: ReaderStore; writes: [StorageKey, unknown][] }> {
  const fake = fakeStorage(initial);
  const store = createReaderStore(fake.storage);

  await store.getState().restore();
  store.getState().attachEdition(EDITIONS, BBOXES);

  return { store, writes: fake.writes };
}

describe('surahAtPage', () => {
  it('returns the surah of the smallest absolute ayah on the page', () => {
    expect(surahAtPage(BBOXES, 1)).toBe(1);
    expect(surahAtPage(BBOXES, 4)).toBe(2);
  });

  it('labels a surah boundary page with the surah it starts in', () => {
    // The map's first key is surah 2, but ayah 6 (surah 1) comes first.
    expect(surahAtPage(BBOXES, 3)).toBe(1);
  });

  it('has no answer for a page with no boxes', () => {
    expect(surahAtPage(BBOXES, 500)).toBeNull();
  });
});

describe('initial state', () => {
  it('starts idle on the first page with nothing attached', () => {
    const store = createReaderStore(fakeStorage().storage);

    expect(store.getState()).toMatchObject({
      editionKey: null,
      page: 1,
      surah: 1,
      ayahKey: null,
      direction: null,
      status: 'idle',
      preferredEditionKey: null,
      restoredPage: null,
      edition: null,
      bboxes: null,
    });
  });
});

describe('restore', () => {
  it('reads the stored edition and page without attaching them yet', async () => {
    const fake = fakeStorage({
      [STORAGE_KEYS.quranEdition]: '2',
      [STORAGE_KEYS.lastVisitedPage]: 120,
    });
    const store = createReaderStore(fake.storage);

    await store.getState().restore();

    expect(store.getState()).toMatchObject({
      preferredEditionKey: '2',
      restoredPage: 120,
      editionKey: null,
      status: 'idle',
    });
    expect(fake.reads).toEqual([
      STORAGE_KEYS.quranEdition,
      STORAGE_KEYS.lastVisitedPage,
    ]);
  });

  it('ignores corrupt or nonsensical stored values instead of repairing them', async () => {
    const fake = fakeStorage({
      [STORAGE_KEYS.quranEdition]: 7,
      [STORAGE_KEYS.lastVisitedPage]: 'twelve',
    });
    const store = createReaderStore(fake.storage);

    await store.getState().restore();

    expect(store.getState()).toMatchObject({
      preferredEditionKey: null,
      restoredPage: null,
    });
  });

  it.each([['   '], [''], [7]])(
    'rejects the invalid edition key %p',
    async (storedEdition) => {
      const fake = fakeStorage({
        [STORAGE_KEYS.quranEdition]: storedEdition,
        [STORAGE_KEYS.lastVisitedPage]: 2,
      });
      const store = createReaderStore(fake.storage);

      await store.getState().restore();

      expect(store.getState().preferredEditionKey).toBeNull();
      expect(store.getState().restoredPage).toBe(2);
    },
  );

  it.each([[0], [-4], [1.5], ['twelve']])(
    'rejects the invalid page %p',
    async (storedPage) => {
      const fake = fakeStorage({
        [STORAGE_KEYS.quranEdition]: '1',
        [STORAGE_KEYS.lastVisitedPage]: storedPage,
      });
      const store = createReaderStore(fake.storage);

      await store.getState().restore();

      expect(store.getState().preferredEditionKey).toBe('1');
      expect(store.getState().restoredPage).toBeNull();
    },
  );

  it('reports "restoring" while storage is still being read', () => {
    const storage: StorageService = {
      getItem: <T>() => new Promise<T>(() => {}),
      setItem: async () => true,
      removeItem: async () => true,
      clear: async () => true,
    };
    const store = createReaderStore(storage);

    void store.getState().restore();

    expect(store.getState().status).toBe('restoring');
  });
});

describe('attachEdition', () => {
  it('resolves the stored edition and restores the last visited page', async () => {
    const { store } = await mountedReader({
      [STORAGE_KEYS.quranEdition]: '1',
      [STORAGE_KEYS.lastVisitedPage]: 2,
    });

    expect(store.getState()).toMatchObject({
      editionKey: '1',
      edition: { name: 'Edition 1' },
      page: 2,
      surah: 1,
      status: 'ready',
      restoredPage: null,
    });
    expect(store.getState().bboxes).toBe(BBOXES);
  });

  it('falls back to the first edition when the stored one is gone', async () => {
    const { store } = await mountedReader({
      [STORAGE_KEYS.quranEdition]: '9',
      [STORAGE_KEYS.lastVisitedPage]: 5,
    });

    expect(store.getState().editionKey).toBe('1');
    expect(store.getState().page).toBe(5);
  });

  it('clamps a stored page that the edition does not have', async () => {
    const fake = fakeStorage({
      [STORAGE_KEYS.quranEdition]: '2',
      [STORAGE_KEYS.lastVisitedPage]: 1,
    });
    const store = createReaderStore(fake.storage);

    await store.getState().restore();
    store.getState().attachEdition(EDITIONS, BBOXES_2);

    expect(store.getState()).toMatchObject({
      editionKey: '2',
      page: 4,
      surah: 2,
    });
  });

  it('keeps a stored page inside the stored edition', async () => {
    const fake = fakeStorage({
      [STORAGE_KEYS.quranEdition]: '2',
      [STORAGE_KEYS.lastVisitedPage]: 5,
    });
    const store = createReaderStore(fake.storage);

    await store.getState().restore();
    store.getState().attachEdition(EDITIONS, BBOXES_2);

    expect(store.getState()).toMatchObject({ page: 5, surah: 3 });
  });

  it('does nothing for an empty catalog instead of crashing boot', () => {
    const store = createReaderStore(fakeStorage().storage);

    store.getState().attachEdition({}, BBOXES);

    expect(store.getState()).toMatchObject({
      editionKey: null,
      edition: null,
      status: 'idle',
    });
  });

  it('consumes the stored page, so a refetch does not jump back', async () => {
    const { store } = await mountedReader({
      [STORAGE_KEYS.lastVisitedPage]: 2,
    });

    store.getState().goToPage(1);
    store.getState().attachEdition(EDITIONS, BBOXES);

    expect(store.getState().page).toBe(1);
  });

  it('keeps the current edition when it is re-attached after a switch', async () => {
    const { store } = await mountedReader();
    store.getState().switchEdition(EDITIONS, BBOXES_2, '2');

    store.getState().attachEdition(EDITIONS, BBOXES_2);

    expect(store.getState()).toMatchObject({
      editionKey: '2',
      page: 4,
    });
  });

  it('keeps a selection that is still visible after a bbox refetch', async () => {
    const { store } = await mountedReader({
      [STORAGE_KEYS.lastVisitedPage]: 2,
    });
    store.getState().selectAyah('3');

    store.getState().attachEdition(EDITIONS, BBOXES);

    expect(store.getState().ayahKey).toBe('3');
  });
});

describe('switchEdition', () => {
  it('persists the key and clamps the reader into the new edition', async () => {
    const { store, writes } = await mountedReader({
      [STORAGE_KEYS.lastVisitedPage]: 2,
    });

    store.getState().switchEdition(EDITIONS, BBOXES_2, '2');

    expect(store.getState()).toMatchObject({
      editionKey: '2',
      page: 4,
      surah: 2,
      status: 'ready',
    });
    expect(writes).toEqual([
      [STORAGE_KEYS.lastVisitedPage, 4],
      [STORAGE_KEYS.quranEdition, '2'],
    ]);
  });

  it('keeps the page when the new edition has it', async () => {
    const fake = fakeStorage({ [STORAGE_KEYS.quranEdition]: '2' });
    const store = createReaderStore(fake.storage);
    await store.getState().restore();
    store.getState().attachEdition(EDITIONS, BBOXES_2);
    store.getState().goToPage(5);
    fake.writes.length = 0;

    store.getState().switchEdition(EDITIONS, BBOXES, '1');

    expect(store.getState()).toMatchObject({
      editionKey: '1',
      page: 5,
      surah: 2,
    });
    expect(fake.writes).toEqual([[STORAGE_KEYS.quranEdition, '1']]);
  });

  it('clears the selection and any pending page turn', async () => {
    const { store } = await mountedReader();
    store.getState().goToPage(2);
    store.getState().selectAyah('3');

    store.getState().switchEdition(EDITIONS, BBOXES, '1');

    expect(store.getState()).toMatchObject({
      ayahKey: null,
      direction: null,
    });
  });

  it('falls back to the first edition for a key the catalog lost', async () => {
    const { store } = await mountedReader();

    store.getState().switchEdition(EDITIONS, BBOXES, '9');

    expect(store.getState().editionKey).toBe('1');
  });

  it('does nothing for an empty catalog', async () => {
    const { store } = await mountedReader();

    store.getState().switchEdition({}, BBOXES_2, '2');

    expect(store.getState().editionKey).toBe('1');
  });
});

describe('goToPage', () => {
  it('turns forward, clears the selection and remembers the page', async () => {
    const { store, writes } = await mountedReader();

    store.getState().selectAyah('1');
    store.getState().goToPage(2);

    expect(store.getState()).toMatchObject({
      page: 2,
      surah: 1,
      ayahKey: null,
      direction: 'forward',
    });
    expect(writes).toEqual([[STORAGE_KEYS.lastVisitedPage, 2]]);
  });

  it('turns backward', async () => {
    const { store } = await mountedReader({
      [STORAGE_KEYS.lastVisitedPage]: 2,
    });

    store.getState().goToPage(1);

    expect(store.getState().direction).toBe('backward');
  });

  it('clamps above and below the edition rather than refusing to move', async () => {
    const { store } = await mountedReader();

    store.getState().goToPage(900);
    expect(store.getState().page).toBe(604);

    store.getState().goToPage(0);
    expect(store.getState()).toMatchObject({
      page: 1,
      direction: 'backward',
    });
  });

  it('rounds a fractional page and treats NaN as the first page', async () => {
    const { store } = await mountedReader();

    store.getState().goToPage(2.6);
    expect(store.getState().page).toBe(3);

    store.getState().goToPage(Number.NaN);
    expect(store.getState().page).toBe(1);
  });

  it('labels the page with the surah it starts in', async () => {
    const { store } = await mountedReader();

    store.getState().goToPage(3);
    expect(store.getState().surah).toBe(1);

    store.getState().goToPage(4);
    expect(store.getState().surah).toBe(2);
  });

  it('is a no-op on the current page but still cancels a pending turn', async () => {
    const { store, writes } = await mountedReader();

    store.getState().goToPage(2);
    store.getState().selectAyah('3');
    store.getState().goToPage(2);

    expect(store.getState()).toMatchObject({
      page: 2,
      ayahKey: '3',
      direction: null,
    });
    expect(writes).toEqual([[STORAGE_KEYS.lastVisitedPage, 2]]);
  });

  it('does nothing before an edition is attached', () => {
    const fake = fakeStorage();
    const store = createReaderStore(fake.storage);

    store.getState().goToPage(9);

    expect(store.getState().page).toBe(1);
    expect(fake.writes).toEqual([]);
  });
});

describe('page turns', () => {
  it('moves one page at a time in both directions', async () => {
    const { store } = await mountedReader({
      [STORAGE_KEYS.lastVisitedPage]: 2,
    });

    store.getState().goNextPage();
    expect(store.getState()).toMatchObject({
      page: 3,
      direction: 'forward',
    });

    store.getState().goPrevPage();
    expect(store.getState()).toMatchObject({
      page: 2,
      direction: 'backward',
    });
  });

  it('cannot leave the edition at either end', async () => {
    const { store } = await mountedReader();

    store.getState().goPrevPage();
    expect(store.getState()).toMatchObject({
      page: 1,
      direction: null,
    });

    store.getState().goToPage(604);
    store.getState().goNextPage();
    expect(store.getState()).toMatchObject({
      page: 604,
      direction: null,
    });
  });

  it('clears the previous selection when the page changes', async () => {
    const { store } = await mountedReader();
    store.getState().selectAyah('1');

    store.getState().goNextPage();

    expect(store.getState().ayahKey).toBeNull();
  });
});

describe('goToSurah and goToAyah', () => {
  it('jumps to the first ayah of a surah and selects it', async () => {
    const { store, writes } = await mountedReader();

    store.getState().goToSurah(2);

    expect(store.getState()).toMatchObject({
      page: 3,
      surah: 2,
      ayahKey: '1',
      direction: 'forward',
    });
    expect(writes).toEqual([[STORAGE_KEYS.lastVisitedPage, 3]]);
  });

  it('honours an explicit ayah', async () => {
    const { store } = await mountedReader();

    store.getState().goToSurah(2, 4);

    expect(store.getState()).toMatchObject({
      page: 4,
      surah: 2,
      ayahKey: '4',
    });
  });

  it('selects an ayah on the current page without calling it a page turn', async () => {
    const { store, writes } = await mountedReader({
      [STORAGE_KEYS.lastVisitedPage]: 3,
    });

    store.getState().goToAyah(1, 6);

    expect(store.getState()).toMatchObject({
      page: 3,
      surah: 1,
      ayahKey: '6',
      direction: null,
    });
    expect(writes).toEqual([]);
  });

  it('turns backward when the ayah is on an earlier page', async () => {
    const { store } = await mountedReader({
      [STORAGE_KEYS.lastVisitedPage]: 5,
    });

    store.getState().goToAyah(1, 1);

    expect(store.getState()).toMatchObject({
      page: 1,
      direction: 'backward',
    });
  });

  it.each([
    ['an unknown surah', 114, 1],
    ['an ayah number outside the surah', 2, 287],
    ['an ayah the bbox table does not have', 2, 6],
    ['surah zero', 0, 1],
  ])('ignores %s', async (_label, surah, ayah) => {
    const { store } = await mountedReader();

    store.getState().goToSurah(surah, ayah);

    expect(store.getState()).toMatchObject({
      page: 1,
      surah: 1,
      ayahKey: null,
    });
  });

  it('does nothing before an edition is attached', () => {
    const store = createReaderStore(fakeStorage().storage);

    store.getState().goToSurah(2);

    expect(store.getState()).toMatchObject({
      page: 1,
      surah: 1,
      ayahKey: null,
    });
  });
});

describe('selection', () => {
  it('selects an ayah and takes its surah from the page table', async () => {
    const { store } = await mountedReader({
      [STORAGE_KEYS.lastVisitedPage]: 3,
    });

    store.getState().selectAyah('1');

    expect(store.getState()).toMatchObject({
      ayahKey: '1',
      surah: 2,
      direction: null,
    });
  });

  it('ignores an ayah that is not on the current page', async () => {
    const { store } = await mountedReader();

    store.getState().selectAyah('7');

    expect(store.getState().ayahKey).toBeNull();
  });

  it('clears the selection', async () => {
    const { store } = await mountedReader();
    store.getState().selectAyah('1');

    store.getState().clearSelection();

    expect(store.getState().ayahKey).toBeNull();
  });

  it('lets the page-turn animation settle', async () => {
    const { store } = await mountedReader();
    store.getState().goToPage(2);

    store.getState().clearDirection();

    expect(store.getState().direction).toBeNull();
  });
});
