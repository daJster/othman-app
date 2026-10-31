import {
  act,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import { Text } from 'react-native';
import type { EditionBboxes, QuranEdition } from '@/core/types';
import {
  createReaderStore,
  type ReaderStore,
} from '@/features/quran/store/reader-store';
import {
  useReaderActions,
  useReaderPage,
  useReaderStatus,
  useReaderSurah,
  useRestoreReader,
} from '@/features/quran/store/use-reader';
import {
  STORAGE_KEYS,
  type StorageKey,
  type StorageService,
} from '@/platform/storage';

/**
 * The hooks exist for one reason: a page turn must not re-render every
 * subscriber. These tests prove the subscription boundary rather than the
 * styling — render counts, not pixels.
 */

const BOX = { top: 0.1, left: 0.1, bottom: 0.2, right: 0.9 };

const EDITION: QuranEdition = {
  key: '1',
  name: 'Tajweed',
  riwaya: 'hafs',
  baseUrl: 'https://cdn.test/1',
  bboxUrl: 'https://cdn.test/1/bbox.json',
  bboxReversedUrl: 'https://cdn.test/1/bbox_reversed.json',
  bboxNormUrl: 'https://cdn.test/1/bbox_norm.json',
  bboxReversedNormUrl: 'https://cdn.test/1/bbox_reversed_norm.json',
  firstPage: 1,
  lastPage: 604,
  themeColor: '#FFFFD7',
};

const BBOXES: EditionBboxes = {
  byPage: {
    '1': { '1': { absoluteNumber: 1, surahNumber: 1, bboxes: [BOX] } },
    '2': { '2': { absoluteNumber: 2, surahNumber: 1, bboxes: [BOX] } },
    '4': { '1': { absoluteNumber: 10, surahNumber: 2, bboxes: [BOX] } },
  },
  bySurah: {
    '1': { '1': { absoluteNumber: 1, pageNumber: 1, bboxes: [BOX] } },
    '2': { '1': { absoluteNumber: 10, pageNumber: 4, bboxes: [BOX] } },
  },
};

function fakeStorage(initial: Partial<Record<StorageKey, unknown>> = {}) {
  const values = new Map<string, unknown>(Object.entries(initial));
  const reads: StorageKey[] = [];

  const storage: StorageService = {
    async getItem<T>(key: StorageKey, fallback: T): Promise<T> {
      reads.push(key);

      return values.has(key) ? (values.get(key) as T) : fallback;
    },
    async setItem<T>(key: StorageKey, value: T): Promise<boolean> {
      values.set(key, value);

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

  return { storage, reads };
}

function readyStore(): ReaderStore {
  const store = createReaderStore(fakeStorage().storage);
  store.getState().attachEdition({ '1': EDITION }, BBOXES);

  return store;
}

function PageProbe({
  store,
  onRender,
}: {
  store: ReaderStore;
  onRender: () => void;
}) {
  const page = useReaderPage(store);
  onRender();

  return <Text>{`page ${page}`}</Text>;
}

function SurahProbe({
  store,
  onRender,
}: {
  store: ReaderStore;
  onRender: () => void;
}) {
  const surah = useReaderSurah(store);
  onRender();

  return <Text>{`surah ${surah}`}</Text>;
}

function RestoreProbe({ store }: { store: ReaderStore }) {
  useRestoreReader(store);
  const status = useReaderStatus(store);

  return <Text>{status}</Text>;
}

describe('useRestoreReader', () => {
  it('reads the persisted edition and page when the reader mounts', async () => {
    const fake = fakeStorage({
      [STORAGE_KEYS.quranEdition]: '1',
      [STORAGE_KEYS.lastVisitedPage]: 4,
    });
    const store = createReaderStore(fake.storage);

    await render(<RestoreProbe store={store} />);

    await waitFor(() => expect(store.getState().status).toBe('idle'));
    expect(store.getState().preferredEditionKey).toBe('1');
    expect(store.getState().restoredPage).toBe(4);
    expect(fake.reads).toEqual([
      STORAGE_KEYS.quranEdition,
      STORAGE_KEYS.lastVisitedPage,
    ]);
  });
});

describe('selector subscriptions', () => {
  it('re-renders the page viewer without touching the surah label', async () => {
    const store = readyStore();
    const pageRenders = jest.fn();
    const surahRenders = jest.fn();

    await render(
      <>
        <PageProbe store={store} onRender={pageRenders} />
        <SurahProbe store={store} onRender={surahRenders} />
      </>,
    );

    pageRenders.mockClear();
    surahRenders.mockClear();

    // Pages 1 and 2 are both in surah 1: only the page subscriber should run.
    await act(async () => {
      store.getState().goToPage(2);
    });

    expect(pageRenders).toHaveBeenCalledTimes(1);
    expect(surahRenders).not.toHaveBeenCalled();
  });

  it('re-renders the surah label when the page enters another surah', async () => {
    const store = readyStore();
    const pageRenders = jest.fn();
    const surahRenders = jest.fn();

    await render(
      <>
        <PageProbe store={store} onRender={pageRenders} />
        <SurahProbe store={store} onRender={surahRenders} />
      </>,
    );

    pageRenders.mockClear();
    surahRenders.mockClear();

    await act(async () => {
      store.getState().goToPage(4);
    });

    expect(pageRenders).toHaveBeenCalledTimes(1);
    expect(surahRenders).toHaveBeenCalledTimes(1);
  });
});

describe('useReaderActions', () => {
  it('keeps action identities stable across renders', async () => {
    const store = readyStore();
    const { result, rerender } = await renderHook(() =>
      useReaderActions(store),
    );
    const first = result.current;

    await rerender(undefined);

    expect(result.current).toBe(first);
  });

  it('drives the store without a React event', async () => {
    const store = readyStore();

    await act(async () => {
      store.getState().goNextPage();
    });

    expect(store.getState().page).toBe(2);
  });
});
