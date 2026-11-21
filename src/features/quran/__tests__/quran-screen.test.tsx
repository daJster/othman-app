import { fireEvent, render, screen } from '@testing-library/react-native';
import QuranScreen from '@/app/(tabs)/quran';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import type { QuranEdition } from '@/core/types';

/**
 * The tab is the landing surface, not a second reader: it must open the
 * existing `/reader/[page]` route at the position the pressed session card
 * records. The store is mocked at its boundary instead of booting the whole
 * reader, and the reading log is mocked so the band renders one fixed session
 * instead of the demo seed or the device's stored history.
 */
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPage = jest.fn(() => 12);
const mockSurah = jest.fn(() => 2);
const mockEdition = jest.fn<QuranEdition | null, []>(() => null);
const mockRestore = jest.fn();
const mockParams = jest.fn<Record<string, string | string[] | undefined>, []>(
  () => ({}),
);

const baseEntries = (): ReadingEntry[] => [
  {
    day: '2026-11-04',
    page: 42,
    surah: 2,
    ayahKey: '255',
    editionKey: null,
    at: Date.UTC(2026, 10, 4, 18, 0, 0),
    readPages: [40, 41, 42],
  },
  {
    day: '2026-11-03',
    page: 36,
    surah: 2,
    ayahKey: null,
    editionKey: null,
    at: Date.UTC(2026, 10, 3, 18, 0, 0),
    readPages: [36],
  },
  {
    day: '2026-11-02',
    page: 604,
    surah: 114,
    ayahKey: null,
    editionKey: null,
    at: Date.UTC(2026, 10, 2, 18, 0, 0),
    readPages: [604],
  },
];

const mockEntries: ReadingEntry[] = baseEntries();

jest.mock('@/features/quran/history/use-reading-log', () => ({
  ...jest.requireActual('@/features/quran/history/use-reading-log'),
  useHydrateReadingLog: () => undefined,
  useReadingLog: () => ({ entries: mockEntries, ready: true }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockParams(),
}));

jest.mock('expo-router/head', () => () => null);

jest.mock('@/features/quran/store/use-reader', () => ({
  useRestoreReader: () => mockRestore(),
  useReaderPage: () => mockPage(),
  useReaderSurah: () => mockSurah(),
  useReaderEdition: () => mockEdition(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockEntries.splice(0, mockEntries.length, ...baseEntries());
  mockPage.mockReturnValue(12);
  mockSurah.mockReturnValue(2);
  mockEdition.mockReturnValue(null);
  mockParams.mockReturnValue({});
});

describe('QuranScreen', () => {
  it('opens with the history band first and no page header', async () => {
    await render(<QuranScreen />);

    expect(screen.queryByText('Quran')).toBeNull();
    expect(screen.queryByText('Read the mushaf page by page')).toBeNull();

    const bands = screen
      .getAllByTestId(/quran-(story|resume|activity|history)-band/)
      .map((band) => band.props.testID);

    // Resume reading and recent activity moved to the landing page; the Quran
    // tab is about the book itself now.
    expect(bands).toEqual(['quran-history-band', 'quran-story-band']);
  });

  it('forwards a surah/ayah link to the reader', async () => {
    mockParams.mockReturnValue({ surah: '2', ayah: '255' });

    await render(<QuranScreen />);

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/reader/[page]',
      params: { page: '1', surah: '2', ayah: '255' },
    });
  });

  it('forwards a page link to the reader', async () => {
    mockParams.mockReturnValue({ page: '42' });

    await render(<QuranScreen />);

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/reader/[page]',
      params: { page: '42' },
    });
  });

  it('shows a recoverable error for a malformed link', async () => {
    mockParams.mockReturnValue({ surah: '999' });

    await render(<QuranScreen />);

    expect(screen.getByText('This link is not valid')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Try again'));

    expect(mockReplace).toHaveBeenCalledWith('/quran');
  });
});
