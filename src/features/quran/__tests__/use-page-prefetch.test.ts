import { act, renderHook } from '@testing-library/react-native';
import { Image } from 'expo-image';
import type { QuranEdition } from '@/core/types';
import {
  PREFETCH_DELAY,
  PREFETCH_RADIUS,
  usePagePrefetch,
} from '../use-page-prefetch';

/**
 * Prefetching is a compromise: warm the next pages, but never queue downloads
 * for pages the reader swiped past. The settle timer is the whole mechanism, so
 * these tests drive it directly instead of sleeping.
 */

jest.mock('expo-image', () => ({ Image: { prefetch: jest.fn() } }));

const prefetch = Image.prefetch as jest.Mock;

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

function prefetchedUrls(): string[] {
  return prefetch.mock.calls.flatMap(([urls]) => urls as string[]).sort();
}

beforeEach(() => {
  prefetch.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePagePrefetch', () => {
  it('warms both neighbours without blocking the turn', async () => {
    await renderHook(() => usePagePrefetch(EDITION, 100));

    expect(prefetch).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(PREFETCH_DELAY);
    });

    expect(prefetchedUrls()).toEqual([
      'https://cdn.test/1/pages/098.png',
      'https://cdn.test/1/pages/099.png',
      'https://cdn.test/1/pages/101.png',
      'https://cdn.test/1/pages/102.png',
    ]);
    expect(prefetch).toHaveBeenCalledWith(expect.any(Array), 'memory-disk');
  });

  it('stays inside the edition at its first page', async () => {
    await renderHook(() => usePagePrefetch(EDITION, 1));

    await act(async () => {
      jest.advanceTimersByTime(PREFETCH_DELAY);
    });

    expect(prefetchedUrls()).toEqual([
      'https://cdn.test/1/pages/002.png',
      'https://cdn.test/1/pages/003.png',
    ]);
  });

  it('does nothing without an edition', async () => {
    await renderHook(() => usePagePrefetch(null, 100));

    await act(async () => {
      jest.advanceTimersByTime(PREFETCH_DELAY * 4);
    });

    expect(prefetch).not.toHaveBeenCalled();
  });

  it('only fetches where the reader stopped, not every page swiped past', async () => {
    const { rerender } = await renderHook(
      ({ page }: { page: number }) => usePagePrefetch(EDITION, page),
      { initialProps: { page: 10 } },
    );

    // Three quick turns, none of them settling for a full delay.
    await act(async () => {
      jest.advanceTimersByTime(PREFETCH_DELAY - 1);
    });
    await rerender({ page: 11 });
    await act(async () => {
      jest.advanceTimersByTime(PREFETCH_DELAY - 1);
    });
    await rerender({ page: 12 });
    await act(async () => {
      jest.advanceTimersByTime(PREFETCH_DELAY);
    });

    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(prefetchedUrls()).toEqual([
      'https://cdn.test/1/pages/010.png',
      'https://cdn.test/1/pages/011.png',
      'https://cdn.test/1/pages/013.png',
      'https://cdn.test/1/pages/014.png',
    ]);
  });

  it('cancels the queued fetch when the reader leaves the page', async () => {
    const { unmount } = await renderHook(() => usePagePrefetch(EDITION, 100));

    await unmount();
    await act(async () => {
      jest.advanceTimersByTime(PREFETCH_DELAY * 2);
    });

    expect(prefetch).not.toHaveBeenCalled();
  });

  it('contains a failed prefetch instead of surfacing it', async () => {
    prefetch.mockRejectedValueOnce(new Error('offline'));

    await renderHook(() => usePagePrefetch(EDITION, 100));

    await act(async () => {
      jest.advanceTimersByTime(PREFETCH_DELAY);
    });

    // The call was attempted and its rejection was swallowed: the reader keeps
    // working, and the next page issues its own request on mount.
    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it('covers as many pages as it promises', async () => {
    await renderHook(() => usePagePrefetch(EDITION, 300));

    await act(async () => {
      jest.advanceTimersByTime(PREFETCH_DELAY);
    });

    expect(prefetchedUrls()).toHaveLength(PREFETCH_RADIUS * 2);
  });
});
