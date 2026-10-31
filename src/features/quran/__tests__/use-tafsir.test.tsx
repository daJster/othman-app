import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type {
  ContentBody,
  ContentSource,
  SurahInfoSection,
} from '@/core/types';
import { useTafsirPanel } from '../use-tafsir';
import { tafsirService } from '@/services/tafsir';

/**
 * Content panel query identity.
 *
 * These cases prove the rules the reference panel got wrong: the local ayah is
 * sent to the provider, options and content are keyed by content type, and a
 * type change cannot request the previous type's source id.
 */
jest.mock('@/services/tafsir', () => ({
  tafsirService: {
    sources: jest.fn(),
    content: jest.fn(),
    surahInfo: jest.fn(),
  },
}));

const service = tafsirService as unknown as {
  sources: jest.Mock;
  content: jest.Mock;
  surahInfo: jest.Mock;
};

const AYAH = { surah: 2, ayah: 262, absoluteNumber: 269 };

const TAFSIR_SOURCE: ContentSource = {
  id: 3,
  name: 'تيسير الكريم الرحمن',
  author: 'السعدي',
  category: 'كتب التفسير',
};

const E3RAB_SOURCE: ContentSource = {
  id: 180,
  name: 'المجتبى',
  author: null,
  category: 'إعراب القرآن',
};

const BODY: ContentBody = {
  status: 'ready',
  text: 'text',
  direction: 'rtl',
};

const SECTIONS: SurahInfoSection[] = [
  { key: 'introduction', title: 'نبذة', text: 'سورة البقرة' },
];

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

let client: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  client = makeClient();
  service.sources.mockImplementation(async (type: string) =>
    type === 'e3rab' ? [E3RAB_SOURCE] : [TAFSIR_SOURCE],
  );
  service.content.mockResolvedValue(BODY);
  service.surahInfo.mockResolvedValue(SECTIONS);
});

afterEach(() => {
  client.clear();
});

describe('useTafsirPanel', () => {
  it('selects the first source and loads its body with the local ayah', async () => {
    const { result } = await renderHook(() => useTafsirPanel(AYAH), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() =>
      expect(result.current.content.state.status).toBe('ready'),
    );

    expect(result.current.type).toBe('tafsir');
    expect(result.current.sourceId).toBe(3);
    expect(service.sources).toHaveBeenCalledWith('tafsir', {
      surah: 2,
      ayah: 262,
    });
    expect(service.content).toHaveBeenCalledWith(
      'tafsir',
      { surah: 2, ayah: 262 },
      3,
    );
  });

  it('refetches options and content when the type changes', async () => {
    const { result } = await renderHook(() => useTafsirPanel(AYAH), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() =>
      expect(result.current.content.state.status).toBe('ready'),
    );

    await act(async () => {
      result.current.setType('e3rab');
    });

    await waitFor(() => expect(result.current.sourceId).toBe(180));
    await waitFor(() =>
      expect(service.content).toHaveBeenCalledWith(
        'e3rab',
        { surah: 2, ayah: 262 },
        180,
      ),
    );

    // The previous type's source id is never requested under the new type.
    expect(service.content).not.toHaveBeenCalledWith(
      'e3rab',
      expect.anything(),
      3,
    );
  });

  it('keeps an empty source list as empty and never requests content', async () => {
    service.sources.mockResolvedValue([]);

    const { result } = await renderHook(() => useTafsirPanel(AYAH), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() =>
      expect(result.current.sources.state.status).toBe('empty'),
    );

    expect(result.current.sourceId).toBeNull();
    expect(service.content).not.toHaveBeenCalled();
  });

  it('loads surah information for the surah type instead of a book', async () => {
    const { result } = await renderHook(() => useTafsirPanel(AYAH), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() =>
      expect(result.current.content.state.status).toBe('ready'),
    );

    const sourceCalls = service.sources.mock.calls.length;

    await act(async () => {
      result.current.setType('surah');
    });

    await waitFor(() =>
      expect(result.current.surahInfo.state.status).toBe('ready'),
    );

    expect(service.surahInfo).toHaveBeenCalledWith(2);
    expect(result.current.sourceId).toBeNull();
    expect(service.sources.mock.calls).toHaveLength(sourceCalls);
  });

  it('exposes a retry that recovers a failed body', async () => {
    service.content
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(BODY);

    const { result } = await renderHook(() => useTafsirPanel(AYAH), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() =>
      expect(result.current.content.state.status).toBe('error'),
    );

    if (result.current.content.state.status !== 'error') {
      throw new Error('unreachable');
    }

    const retry = result.current.content.state.retry;

    await act(async () => {
      retry();
    });

    await waitFor(() =>
      expect(result.current.content.state.status).toBe('ready'),
    );
  });

  it('distinguishes a legitimate empty body from a successful one', async () => {
    service.content.mockResolvedValue({
      status: 'empty',
      direction: 'rtl',
    });

    const { result } = await renderHook(() => useTafsirPanel(AYAH), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() =>
      expect(result.current.content.state.status).toBe('empty'),
    );
  });

  it('does nothing without a selected ayah', async () => {
    const { result } = await renderHook(() => useTafsirPanel(null), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.sources.state.status).toBe('pending');
    expect(service.sources).not.toHaveBeenCalled();
    expect(service.content).not.toHaveBeenCalled();
  });
});
