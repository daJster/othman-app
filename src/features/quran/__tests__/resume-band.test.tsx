import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import { ResumeBand } from '@/features/quran/components/resume-band';
import { SEED_READING_LOG } from '@/features/quran/history/seed';

/**
 * The band is the landing page's primary action with the day's goal beside
 * it, so these cases pin what it claims and where it sends the reader: one
 * card — the newest session, marked as the resume card — naming its page,
 * surah and position, a press carrying the whole recorded position, one gauge
 * reading today's count as its centre label, the completion line once the
 * one-page goal is done, and an honest label on demo history.
 *
 * The reading-log hooks are mocked at their boundary — the screen test's
 * pattern: mock the hook module, not the store — so the cases need neither
 * storage nor hydration. `useIsWide` is pinned to the phone layout so the
 * gauge size is the same on every platform, and the gauge adapter is mocked
 * so the cases assert the band's props, not the SVG arc.
 */
const mockOnOpen = jest.fn();
const mockGauge = jest.fn();
let mockEntries: ReadingEntry[] = [];
let mockSurahs: Record<string, { name: string; nameEnglish: string }> = {};
let mockRead = 0;
let mockWide = false;

const queryClient = new QueryClient();

jest.mock('@/ui/layout', () => ({
  useIsWide: () => mockWide,
}));

jest.mock('@/features/quran/components/hizb-gauge', () => ({
  HizbGauge: (props: {
    value: number;
    max: number;
    size?: number;
    strokeWidth?: number;
    centerLabel?: string;
    accessibilityLabel?: string;
  }) => {
    mockGauge(props);
    return null;
  },
}));

jest.mock('@/features/quran/use-quran-catalog', () => ({
  useQuranCatalog: () => ({
    state: { status: 'ready', data: { surahs: mockSurahs, editions: {} } },
  }),
}));

jest.mock('@/features/quran/history/use-reading-log', () => ({
  useHydrateReadingLog: () => undefined,
  useReadingLog: () => ({ entries: mockEntries, ready: true }),
  useDailyHizb: (_day: string, target: number) => ({
    read: Math.min(mockRead, target),
    target,
    done: mockRead >= target,
  }),
}));

function entry(
  page: number,
  surah: number,
  daysAgo: number,
  ayahKey: string | null = null,
): ReadingEntry {
  const at = new Date();
  at.setHours(20, 0, 0, 0);
  at.setDate(at.getDate() - daysAgo);

  return {
    day: formatDateKey(at),
    page,
    surah,
    ayahKey,
    editionKey: null,
    at: at.getTime(),
    readPages: [page],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEntries = [];
  mockSurahs = {};
  mockRead = 0;
  mockWide = false;
});

describe('ResumeBand', () => {
  it("renders one card beside one gauge showing today's read count", async () => {
    mockEntries = [
      entry(604, 114, 1),
      entry(440, 36, 2),
      entry(338, 22, 3),
      entry(258, 14, 4),
    ];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const cards = screen.getAllByTestId('quran-session-card');
    expect(cards).toHaveLength(1);

    expect(within(cards[0]).getByText('Page 604 · Yesterday')).toBeTruthy();
    expect(within(cards[0]).getByText('Surah 114')).toBeTruthy();

    // Older sessions are not resume actions, so they are not shown.
    expect(screen.queryByText('Page 440')).toBeNull();
    expect(screen.queryByText('Page 258')).toBeNull();

    // The gauge reads today's count, not a second card.
    expect(mockGauge).toHaveBeenCalledTimes(1);
    expect(mockGauge).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 0,
        max: 1,
        centerLabel: '0',
        accessibilityLabel: '0 of 1 page',
        size: 104,
        strokeWidth: 8,
      }),
    );
  });

  it('uses the large gauge from md', async () => {
    mockEntries = [entry(42, 2, 0)];
    mockWide = true;

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(mockGauge).toHaveBeenCalledWith(
      expect.objectContaining({ size: 128, strokeWidth: 10 }),
    );
  });

  it('marks the single card as the resume card', async () => {
    mockEntries = [entry(5, 2, 0), entry(4, 2, 1), entry(3, 2, 2)];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [only] = screen.getAllByTestId('quran-session-card');

    expect(only.props.dataSet).toEqual({ latest: true });
  });

  it('shows the selected ayah instead of the relative day', async () => {
    mockEntries = [entry(42, 2, 1, '255')];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [only] = screen.getAllByTestId('quran-session-card');

    expect(within(only).getByText('Page 42 · Ayah 255')).toBeTruthy();
    expect(within(only).queryByText('Yesterday')).toBeNull();
  });

  it('labels a card with its page, surah and position', async () => {
    mockEntries = [entry(42, 2, 1, '255')];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getByLabelText('Page 42 · Surah 2 · Ayah 255')).toBeTruthy();
  });

  it('passes the whole recorded position when the card is pressed', async () => {
    mockEntries = [entry(42, 2, 1, '255')];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [only] = screen.getAllByTestId('quran-session-card');

    await fireEvent.press(only);

    expect(mockOnOpen).toHaveBeenCalledWith({
      page: 42,
      surah: 2,
      ayahKey: '255',
    });
  });

  it('renders only the sessions the log has', async () => {
    mockEntries = [entry(12, 2, 0)];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getAllByTestId('quran-session-card')).toHaveLength(1);
    expect(screen.getByText('Page 12 · Today')).toBeTruthy();
    expect(screen.queryByText('Previous readings')).toBeNull();
    expect(screen.queryByText('Sample history')).toBeNull();
  });

  it('shows the completion line once the one-page goal is done', async () => {
    mockEntries = [entry(42, 2, 0)];
    mockRead = 1;

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(mockGauge).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 1,
        max: 1,
        centerLabel: '1',
        accessibilityLabel: '1 of 1 page',
      }),
    );
    expect(screen.getByTestId('quran-hizb-done')).toBeTruthy();
    expect(screen.getByText('Daily goal complete')).toBeTruthy();
  });

  it('hides the completion line while the goal is open', async () => {
    mockEntries = [entry(42, 2, 0)];
    mockRead = 0;

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.queryByTestId('quran-hizb-done')).toBeNull();
  });

  it('shows one line instead of a labelled void when the log is empty', async () => {
    mockEntries = [];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.queryByTestId('quran-session-card')).toBeNull();
    expect(mockGauge).not.toHaveBeenCalled();
    expect(screen.getByText('Your last page will appear here')).toBeTruthy();
  });

  it('shows the sample note and does not claim the seed as the current position', async () => {
    mockEntries = SEED_READING_LOG;

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getByText('Resume reading')).toBeTruthy();
    expect(screen.getByText('Sample history')).toBeTruthy();
    // No block claims the reader is on the seed's last page.
    expect(screen.queryByText('Continue reading')).toBeNull();

    const cards = screen.getAllByTestId('quran-session-card');
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText('Page 604 · Yesterday')).toBeTruthy();
    expect(within(cards[0]).getByText('Surah 114')).toBeTruthy();
  });

  it('keeps the sample note after a real reading joins the seed', async () => {
    mockEntries = [entry(42, 2, 0), ...SEED_READING_LOG];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const cards = screen.getAllByTestId('quran-session-card');
    expect(within(cards[0]).getByText('Page 42 · Today')).toBeTruthy();
    expect(within(cards[0]).getByText('Surah 2')).toBeTruthy();
    expect(screen.getByText('Sample history')).toBeTruthy();
  });

  it('does not render the old hizb band', async () => {
    mockEntries = [entry(42, 2, 0)];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.queryByTestId('quran-hizb-band')).toBeNull();
  });
});

/**
 * The card names the surah from the catalog the mushaf uses, and falls back to
 * the number when that payload is not there. Both branches matter: the name is
 * the useful label, the number is the only true one before the catalog lands.
 */
describe('ReadingSessionCard surah name', () => {
  it('prints the catalog name instead of the surah number', async () => {
    mockEntries = [entry(604, 114, 1)];
    mockSurahs = {
      '114': { name: 'الناس', nameEnglish: 'An-Nas' },
    };

    await render(
      <QueryClientProvider client={queryClient}>
        <ResumeBand onOpen={mockOnOpen} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('An-Nas')).toBeTruthy();
    expect(screen.queryByText('Surah 114')).toBeNull();
  });

  it('falls back to the number when the catalog has no such surah', async () => {
    mockEntries = [entry(604, 114, 1)];
    mockSurahs = {};

    await render(
      <QueryClientProvider client={queryClient}>
        <ResumeBand onOpen={mockOnOpen} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Surah 114')).toBeTruthy();
  });
});
