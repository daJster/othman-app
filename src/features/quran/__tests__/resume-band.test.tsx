import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import { ResumeBand } from '@/features/quran/components/resume-band';
import { SEED_READING_LOG } from '@/features/quran/history/seed';

/**
 * The band is the landing page's primary action, so these cases pin what it
 * claims and where it sends the reader: the three newest sessions in one row,
 * the newest marked as the resume card, each card naming its page, surah and
 * position, a press carrying the whole recorded position, and an honest label
 * on demo history.
 *
 * The reading-log hooks are mocked at their boundary — the screen test's
 * pattern: mock the hook module, not the store — so the cases need neither
 * storage nor hydration. `useIsWide` is pinned to the phone layout so the
 * rail is the same shape on every platform.
 */
const mockOnOpen = jest.fn();
let mockEntries: ReadingEntry[] = [];
let mockWide = false;

jest.mock('@/features/quran/history/use-reading-log', () => ({
  useHydrateReadingLog: () => undefined,
  useReadingLog: () => ({ entries: mockEntries, ready: true }),
}));

jest.mock('@/ui/layout', () => ({
  useIsWide: () => mockWide,
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
  mockWide = false;
});

describe('ResumeBand', () => {
  it('renders the three newest sessions, newest first', async () => {
    mockEntries = [
      entry(604, 114, 1),
      entry(440, 36, 2),
      entry(338, 22, 3),
      entry(258, 14, 4),
    ];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const cards = screen.getAllByTestId('quran-session-card');
    expect(cards).toHaveLength(3);

    expect(within(cards[0]).getByText('604')).toBeTruthy();
    expect(within(cards[0]).getByText('Surah 114')).toBeTruthy();
    expect(within(cards[0]).getByText('Yesterday')).toBeTruthy();

    expect(within(cards[1]).getByText('440')).toBeTruthy();
    expect(within(cards[1]).getByText('Surah 36')).toBeTruthy();
    expect(within(cards[1]).getByText('2 days ago')).toBeTruthy();

    expect(within(cards[2]).getByText('338')).toBeTruthy();
    expect(within(cards[2]).getByText('Surah 22')).toBeTruthy();

    // The fourth day is older than the row's three slots.
    expect(screen.queryByText('258')).toBeNull();
  });

  it('marks only the newest card as the resume card', async () => {
    mockEntries = [entry(5, 2, 0), entry(4, 2, 1), entry(3, 2, 2)];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [newest, second, third] = screen.getAllByTestId('quran-session-card');

    expect(newest.props.dataSet).toEqual({ latest: true });
    expect(second.props.dataSet).toEqual({ latest: false });
    expect(third.props.dataSet).toEqual({ latest: false });
  });

  it('shows the selected ayah instead of the relative day', async () => {
    mockEntries = [entry(42, 2, 1, '255'), entry(41, 2, 2)];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [withAyah, withoutAyah] = screen.getAllByTestId('quran-session-card');

    expect(within(withAyah).getByText('Ayah 255')).toBeTruthy();
    expect(within(withAyah).queryByText('Yesterday')).toBeNull();

    expect(within(withoutAyah).getByText('2 days ago')).toBeTruthy();
  });

  it('labels a card with its page, surah and position', async () => {
    mockEntries = [entry(42, 2, 1, '255')];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getByLabelText('Page 42 · Surah 2 · Ayah 255')).toBeTruthy();
  });

  it('passes the whole recorded position when a card is pressed', async () => {
    mockEntries = [entry(42, 2, 1, '255'), entry(41, 2, 2)];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [withAyah, withoutAyah] = screen.getAllByTestId('quran-session-card');

    await fireEvent.press(withAyah);

    expect(mockOnOpen).toHaveBeenCalledWith({
      page: 42,
      surah: 2,
      ayahKey: '255',
    });

    await fireEvent.press(withoutAyah);

    expect(mockOnOpen).toHaveBeenLastCalledWith({
      page: 41,
      surah: 2,
      ayahKey: null,
    });
  });

  it('renders only the sessions the log has', async () => {
    mockEntries = [entry(12, 2, 0)];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getAllByTestId('quran-session-card')).toHaveLength(1);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.queryByText('Previous readings')).toBeNull();
    expect(screen.queryByText('Sample history')).toBeNull();
  });

  it('shows the sample note and does not claim the seed as the current position', async () => {
    mockEntries = SEED_READING_LOG;

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getByText('Recent readings')).toBeTruthy();
    expect(screen.getByText('Sample history')).toBeTruthy();
    // No block claims the reader is on the seed's last page.
    expect(screen.queryByText('Continue reading')).toBeNull();

    const cards = screen.getAllByTestId('quran-session-card');
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByText('604')).toBeTruthy();
    expect(within(cards[0]).getByText('Surah 114')).toBeTruthy();
  });

  it('keeps the sample note after a real reading joins the seed', async () => {
    mockEntries = [entry(42, 2, 0), ...SEED_READING_LOG];

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const cards = screen.getAllByTestId('quran-session-card');
    expect(within(cards[0]).getByText('42')).toBeTruthy();
    expect(within(cards[0]).getByText('Surah 2')).toBeTruthy();
    expect(screen.getByText('Sample history')).toBeTruthy();
  });
});
