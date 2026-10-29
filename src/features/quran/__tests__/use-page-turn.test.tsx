import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import type { EditionBboxes, QuranEdition } from '@/core/types';
import { createReaderStore } from '../store/reader-store';
import { usePageTurn } from '../use-page-turn';
import type { StorageKey, StorageService } from '@/platform/storage';

/**
 * Haptics, and the rule that they only fire on a real turn.
 *
 * The store already has the navigation tests; what is left here is the feedback
 * contract, which lives outside the store so the footer, the gesture and any
 * future keyboard shortcut all behave the same.
 */

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const haptics = Haptics as unknown as { impactAsync: jest.Mock };

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
  lastPage: 3,
  themeColor: '#FFFFD7',
};

const BOX = { top: 0.1, left: 0.1, bottom: 0.2, right: 0.9 };

const BBOXES: EditionBboxes = {
  byPage: {
    '1': { '1': { absoluteNumber: 1, surahNumber: 1, bboxes: [BOX] } },
    '2': { '1': { absoluteNumber: 2, surahNumber: 1, bboxes: [BOX] } },
    '3': { '1': { absoluteNumber: 3, surahNumber: 1, bboxes: [BOX] } },
  },
  bySurah: {
    '1': { '1': { absoluteNumber: 1, pageNumber: 1, bboxes: [BOX] } },
  },
};

const storage: StorageService = {
  async getItem<T>(_key: StorageKey, fallback: T): Promise<T> {
    return fallback;
  },
  setItem: async () => true,
  removeItem: async () => true,
  clear: async () => true,
};

function readyStore(page = 2) {
  const store = createReaderStore(storage);
  store.getState().attachEdition({ '1': EDITION }, BBOXES);
  store.getState().goToPage(page);

  return store;
}

beforeEach(() => {
  haptics.impactAsync.mockClear();
});

describe('usePageTurn', () => {
  it('turns forward and confirms it with a light tap', async () => {
    const store = readyStore(1);
    const { result } = await renderHook(() => usePageTurn(store));

    await act(async () => {
      result.current.turnForward();
    });

    expect(store.getState().page).toBe(2);
    expect(haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('turns backward and confirms it with a light tap', async () => {
    const store = readyStore(2);
    const { result } = await renderHook(() => usePageTurn(store));

    await act(async () => {
      result.current.turnBackward();
    });

    expect(store.getState().page).toBe(1);
    expect(haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('does not buzz when there is nowhere to turn', async () => {
    const store = readyStore(1);
    const { result } = await renderHook(() => usePageTurn(store));

    await act(async () => {
      result.current.turnBackward();
    });

    expect(store.getState().page).toBe(1);
    expect(haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('survives a device without a taptic engine', async () => {
    haptics.impactAsync.mockRejectedValueOnce(new Error('unsupported'));
    const store = readyStore(1);
    const { result } = await renderHook(() => usePageTurn(store));

    await act(async () => {
      result.current.turnForward();
    });

    // The page has still turned; feedback is optional.
    expect(store.getState().page).toBe(2);
  });
});
