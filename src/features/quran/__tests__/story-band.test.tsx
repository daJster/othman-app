import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { SurahMetadata } from '@/core/types';
import { StoryBand } from '@/features/quran/components/story-band';
import type { AsyncPresentResult } from '@/features/query/async-state';
import { i18n } from '@/i18n';
import type { QuranCatalog } from '@/services/quran';
import { pickStory } from '../story/pick-story';
import { STORIES, type Story } from '../story/stories';

/**
 * The band is the one module that sends a reader somewhere they were not
 * already going, so these cases pin the source of its facts and where it lands:
 * the catalog's name when it has loaded, the surah number and the note when it
 * has not, nothing at all when the catalog does not know the surah, and the
 * story's own page when pressed.
 *
 * The catalog hook is mocked at its boundary (the query contract is covered by
 * `quran-queries.test.tsx`). The provider is real because the band reads the
 * query client to decide whether a catalog can exist at all.
 */
const mockPush = jest.fn();
let mockCatalog: AsyncPresentResult<QuranCatalog>;
let story: Story;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../use-quran-catalog', () => ({
  useQuranCatalog: () => mockCatalog,
}));

function provider() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

function metadata(overrides: Partial<SurahMetadata> = {}): SurahMetadata {
  return {
    number: story.surah,
    name: 'السورة',
    nameEnglish: 'The Surah',
    location: 'makka',
    ayahCount: 7,
    ...overrides,
  };
}

function ready(
  surahs: Record<string, SurahMetadata>,
): AsyncPresentResult<QuranCatalog> {
  return {
    state: { status: 'ready', data: { editions: {}, surahs } },
    isFetching: false,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  story = pickStory(STORIES, new Date());
  mockCatalog = { state: { status: 'pending' }, isFetching: false };
});

describe('StoryBand', () => {
  it('renders the surah name from the catalog', async () => {
    mockCatalog = ready({ [String(story.surah)]: metadata() });

    await render(<StoryBand />, { wrapper: provider() });

    expect(screen.getByText('Surah story')).toBeTruthy();
    expect(screen.getByText('The Surah')).toBeTruthy();
    expect(screen.getByText('Revealed in Makka · 7 ayat')).toBeTruthy();

    const note = i18n.t(story.noteKey);
    expect(note).not.toBe(story.noteKey);
    expect(screen.getByText(note)).toBeTruthy();
  });

  it('falls back to the surah number and the note without a catalog', async () => {
    await render(<StoryBand />, { wrapper: provider() });

    expect(screen.getByText(`Surah ${story.surah}`)).toBeTruthy();
    expect(screen.getByText(i18n.t(story.noteKey))).toBeTruthy();
    expect(screen.queryByText(/Revealed in/)).toBeNull();
  });

  it('hides when the catalog does not know the surah', async () => {
    mockCatalog = ready({});

    await render(<StoryBand />, { wrapper: provider() });

    expect(screen.queryByTestId('quran-story-band')).toBeNull();
  });

  it('opens the story page in the reader', async () => {
    mockCatalog = ready({ [String(story.surah)]: metadata() });

    await render(<StoryBand />, { wrapper: provider() });
    await fireEvent.press(screen.getByTestId('quran-story-band'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reader/[page]',
      params: { page: String(story.page) },
    });
  });
});
