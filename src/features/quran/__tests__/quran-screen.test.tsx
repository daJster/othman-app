import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { Dimensions } from 'react-native';
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

    expect(bands).toEqual([
      'quran-history-band',
      'quran-resume-band',
      'quran-activity-band',
      'quran-story-band',
    ]);
  });

  it('renders the recorded session and opens it in the reader', async () => {
    await render(<QuranScreen />);

    expect(mockRestore).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();

    const cards = screen.getAllByTestId('quran-session-card');
    expect(cards).toHaveLength(1);

    await fireEvent.press(cards[0]);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reader/[page]',
      params: { page: '42', surah: '2', ayah: '255' },
    });
  });

  it('opens a page-only session with just its page', async () => {
    mockEntries.splice(0, mockEntries.length, {
      day: '2026-11-03',
      page: 36,
      surah: 2,
      ayahKey: null,
      editionKey: null,
      at: Date.UTC(2026, 10, 3, 18, 0, 0),
      readPages: [36],
    });

    await render(<QuranScreen />);

    const cards = screen.getAllByTestId('quran-session-card');
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText(/Page 36/)).toBeTruthy();
    await fireEvent.press(cards[0]);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reader/[page]',
      params: { page: '36' },
    });
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

  it('shows each recorded position instead of the reader store position', async () => {
    mockEdition.mockReturnValue({
      key: '1',
      name: 'Madani',
      riwaya: 'Hafs',
      baseUrl: 'https://example.test',
      bboxUrl: '',
      bboxReversedUrl: '',
      bboxNormUrl: '',
      bboxReversedNormUrl: '',
      firstPage: 1,
      lastPage: 604,
      themeColor: '#ffffff',
    });

    await render(<QuranScreen />);

    // The band is driven by the log, not by the stored reader position or an
    // attached edition, and it no longer offers a page preview control.
    expect(screen.getByText('Resume reading')).toBeTruthy();
    expect(screen.queryByText('Surah 2 · page 12 of 604')).toBeNull();
    expect(screen.queryByTestId('quran-preview-open')).toBeNull();

    const cards = screen.getAllByTestId('quran-session-card');
    expect(cards).toHaveLength(1);

    expect(within(cards[0]).getByText('Page 42 · Ayah 255')).toBeTruthy();
    expect(within(cards[0]).getByText('Surah 2')).toBeTruthy();
    expect(screen.queryByText('Page 36')).toBeNull();
  });

  it('shows a recoverable error for a malformed link', async () => {
    mockParams.mockReturnValue({ surah: '999' });

    await render(<QuranScreen />);

    expect(screen.getByText('This link is not valid')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Try again'));

    expect(mockReplace).toHaveBeenCalledWith('/quran');
  });

  it('locks sections 1 and 2 to 30/70 of the phone viewport', async () => {
    await render(<QuranScreen />);

    const { height: windowHeight, width: windowWidth } =
      Dimensions.get('window');

    expect(windowWidth).toBeLessThan(768);
    expect(screen.getByTestId('quran-section-history').props.style).toEqual({
      height: Math.round(windowHeight * 0.3),
    });
    expect(screen.getByTestId('quran-section-resume').props.style).toEqual({
      height: Math.round(windowHeight * 0.7),
    });
    expect(
      screen.getByTestId('quran-section-activity').props.style,
    ).toBeUndefined();
  });
});
