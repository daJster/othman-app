import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { EditionBboxes, QuranEdition } from '@/core/types';
import { quranService } from '@/services/quran';
import { useEditionBboxes } from '../use-edition-bboxes';
import { useQuranCatalog } from '../use-quran-catalog';

/**
 * The two server reads behind the reader.
 *
 * The service is mocked at its barrel, which keeps the CDN and the HTTP client
 * out of the test process; what is being tested is the query contract: one
 * catalog fetch for the whole session, bbox tables keyed per edition, and a
 * disabled query that neither fires nor pretends to have data.
 */

// `jest.mock` is hoisted above the imports, so `quranService` below is the fake.
jest.mock('@/services/quran', () => ({
  quranService: {
    loadCatalog: jest.fn(),
    loadBboxes: jest.fn(),
  },
}));

const service = quranService as unknown as {
  loadCatalog: jest.Mock;
  loadBboxes: jest.Mock;
};

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

const CATALOG = { editions: { '1': EDITION }, surahs: {} };

const BBOXES: EditionBboxes = {
  byPage: {},
  bySurah: {},
};

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  service.loadCatalog.mockReset();
  service.loadBboxes.mockReset();
});

describe('useQuranCatalog', () => {
  it('resolves the editions and surah metadata', async () => {
    service.loadCatalog.mockResolvedValue(CATALOG);

    const { result } = await renderHook(() => useQuranCatalog(), {
      wrapper: wrapper(makeClient()),
    });

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    expect(result.current.state).toMatchObject({ data: CATALOG });
  });

  it('fetches the catalog once, not once per reader mount', async () => {
    service.loadCatalog.mockResolvedValue(CATALOG);
    const client = makeClient();

    const first = await renderHook(() => useQuranCatalog(), {
      wrapper: wrapper(client),
    });
    await waitFor(() =>
      expect(first.result.current.state.status).toBe('ready'),
    );

    const second = await renderHook(() => useQuranCatalog(), {
      wrapper: wrapper(client),
    });
    await waitFor(() =>
      expect(second.result.current.state.status).toBe('ready'),
    );

    expect(service.loadCatalog).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed read with a retry that re-runs it', async () => {
    service.loadCatalog
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(CATALOG);

    const { result } = await renderHook(() => useQuranCatalog(), {
      wrapper: wrapper(makeClient()),
    });

    await waitFor(() => expect(result.current.state.status).toBe('error'));

    const state = result.current.state;
    if (state.status !== 'error') throw new Error('expected an error state');
    state.retry();

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(service.loadCatalog).toHaveBeenCalledTimes(2);
  });
});

describe('useEditionBboxes', () => {
  it('does not fetch anything before an edition is resolved', async () => {
    const { result } = await renderHook(() => useEditionBboxes(null), {
      wrapper: wrapper(makeClient()),
    });

    expect(result.current.state.status).toBe('pending');
    expect(service.loadBboxes).not.toHaveBeenCalled();
  });

  it('loads the tables of the edition it is given', async () => {
    service.loadBboxes.mockResolvedValue(BBOXES);

    const { result } = await renderHook(() => useEditionBboxes(EDITION), {
      wrapper: wrapper(makeClient()),
    });

    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    expect(service.loadBboxes).toHaveBeenCalledWith(EDITION);
    expect(result.current.state).toMatchObject({ data: BBOXES });
  });

  it('caches each edition separately', async () => {
    service.loadBboxes.mockResolvedValue(BBOXES);
    const client = makeClient();
    const other: QuranEdition = { ...EDITION, key: '2' };

    const first = await renderHook(() => useEditionBboxes(EDITION), {
      wrapper: wrapper(client),
    });
    await waitFor(() =>
      expect(first.result.current.state.status).toBe('ready'),
    );

    const second = await renderHook(() => useEditionBboxes(other), {
      wrapper: wrapper(client),
    });
    await waitFor(() =>
      expect(second.result.current.state.status).toBe('ready'),
    );

    // Back to the first edition: a cache hit, not a second download.
    await renderHook(() => useEditionBboxes(EDITION), {
      wrapper: wrapper(client),
    });

    expect(service.loadBboxes).toHaveBeenCalledTimes(2);
    expect(service.loadBboxes).toHaveBeenNthCalledWith(1, EDITION);
    expect(service.loadBboxes).toHaveBeenNthCalledWith(2, other);
  });

  it('reports a failed download as retryable', async () => {
    service.loadBboxes.mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => useEditionBboxes(EDITION), {
      wrapper: wrapper(makeClient()),
    });

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toMatchObject({ error: new Error('offline') });
  });
});
