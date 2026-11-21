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
import { readingLogStore } from '@/features/quran/history/reading-log.store';
import { SEED_READING_LOG } from '@/features/quran/history/seed';

/**
 * The band is the landing page's primary action with the day's metrics beside
 * it, so these cases pin what it claims and where it sends the reader: one
 * card — the newest session, marked as the resume card — naming its page,
 * surah and position, a press carrying the whole recorded position, and four
 * mini gauges in one row. The first gauge reads today's page count as its
 * centre text under the "Pages" caption, with the "X of 1 page" fraction kept
 * as its accessibility label; the other three are zeroed placeholders
 * ("0" + "Salah" / "Duaa" / "Nafila") with no press target. The completion
 * line mounts only once the one-page goal is done, and demo history stays
 * honestly labelled.
 *
 * The reading-log hooks are mocked at their boundary — the screen test's
 * pattern: mock the hook module, not the store — except `useDailyHizb`,
 * which is the real hook via `requireActual`. The mocked entries are synced
 * into the singleton store so the real hook derives its count from the same
 * log the band reads. The gauge adapter is mocked so the cases assert the
 * band's props: it renders the band's `centerLabel` as text and sets the
 * band's `accessibilityLabel` on the host element.
 *
 * `read` is clamped to the 1-page goal (`min(distinct pages today, 1)`), so
 * the only possible live centres are "0" and "1" — one entry today always
 * reads "1", an entry yesterday alone always reads "0".
 */
const mockOnOpen = jest.fn();
let mockEntries: ReadingEntry[] = [];
let mockSurahs: Record<string, { name: string; nameEnglish: string }> = {};
let mockWide = false;

const queryClient = new QueryClient();

/**
 * Practice is fetched through the API registry now. This suite is about the
 * band's composition, so the query is pinned to an empty day and the mutation
 * is a no-op: no QueryClient is needed for the cases that do not wrap one.
 */
jest.mock('@/api', () => ({
  api: { practice: { byDay: { key: () => ['practice', 'day'] } } },
  useApiQuery: () => ({
    data: { day: '2026-11-20', salah: 0, duaa: 0, nafila: 0, pages: 0 },
    isPending: false,
  }),
  useApiMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/ui/layout', () => ({
  useIsWide: () => mockWide,
}));

jest.mock('@/features/quran/components/hizb-gauge', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    HizbGauge: (props: {
      value?: number;
      max?: number;
      size?: number;
      strokeWidth?: number;
      centerLabel?: string;
      accessibilityLabel?: string;
    }) =>
      React.createElement(
        Text,
        { accessibilityLabel: props.accessibilityLabel },
        props.centerLabel,
      ),
  };
});

jest.mock('@/features/quran/use-quran-catalog', () => ({
  useQuranCatalog: () => ({
    state: { status: 'ready', data: { surahs: mockSurahs, editions: {} } },
  }),
}));

jest.mock('@/features/quran/history/use-reading-log', () => ({
  ...jest.requireActual('@/features/quran/history/use-reading-log'),
  useHydrateReadingLog: () => undefined,
  useReadingLog: () => ({ entries: mockEntries, ready: true }),
}));

function setLog(entries: ReadingEntry[]) {
  mockEntries = entries;
  readingLogStore.setState({ entries, ready: true });
}

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

function band() {
  return screen.getByTestId('quran-resume-band');
}

function gauges() {
  return within(band()).getAllByTestId(/^practice-gauge-/);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSurahs = {};
  mockWide = false;
  setLog([]);
});

describe('ResumeBand', () => {
  it('renders the overline with one session card and four mini gauges in one row', async () => {
    setLog([entry(604, 114, 1)]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const root = band();
    expect(within(root).getByText('Resume reading')).toBeTruthy();
    expect(within(root).getAllByTestId('quran-session-card')).toHaveLength(1);
    expect(within(root).getAllByTestId(/^practice-gauge-/)).toHaveLength(4);
  });

  it("reads today's count in the first gauge's centre text", async () => {
    setLog([entry(42, 2, 0)]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [first] = gauges();
    expect(within(first).getByText('1')).toBeTruthy();
    expect(within(first).getByText('Pages')).toBeTruthy();
    expect(screen.getByLabelText('Pages: 1')).toBeTruthy();
  });

  it('shows zero in the first gauge when nothing was read today', async () => {
    setLog([entry(604, 114, 1)]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [first] = gauges();
    expect(within(first).getByText('0')).toBeTruthy();
    expect(within(first).getByText('Pages')).toBeTruthy();
    expect(screen.getByLabelText('Pages: 0')).toBeTruthy();
  });

  it('holds the other three gauges as zeroed Salah, Duaa and Nafila placeholders', async () => {
    setLog([entry(42, 2, 0)]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [, salah, duaa, nafila] = gauges();
    expect(within(salah).getByText('Salah')).toBeTruthy();
    expect(within(salah).getByText('0')).toBeTruthy();
    expect(within(duaa).getByText('Duaa')).toBeTruthy();
    expect(within(duaa).getByText('0')).toBeTruthy();
    expect(within(nafila).getByText('Nafila')).toBeTruthy();
    expect(within(nafila).getByText('0')).toBeTruthy();
  });

  it('makes the practice gauges pressable and leaves pages a readout', async () => {
    setLog([entry(42, 2, 0)]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(
      screen.getByTestId('practice-gauge-pages').props.accessibilityRole,
    ).toBeUndefined();

    for (const id of ['salah', 'duaa', 'nafila']) {
      expect(
        screen.getByTestId(`practice-gauge-${id}`).props.accessibilityRole,
      ).toBe('button');
    }
  });

  it('marks the single card as the resume card', async () => {
    setLog([entry(5, 2, 0), entry(4, 2, 1), entry(3, 2, 2)]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [only] = screen.getAllByTestId('quran-session-card');

    expect(only.props.dataSet).toEqual({ latest: true });
  });

  it('renders only the newest session as the resume action', async () => {
    setLog([entry(12, 2, 0)]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getAllByTestId('quran-session-card')).toHaveLength(1);
    expect(screen.getByText('Page 12 · Today')).toBeTruthy();
    expect(screen.queryByText('Previous readings')).toBeNull();
    expect(screen.queryByText('Sample history')).toBeNull();
  });

  it('shows the selected ayah instead of the relative day', async () => {
    setLog([entry(42, 2, 1, '255')]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [only] = screen.getAllByTestId('quran-session-card');

    expect(within(only).getByText('Page 42 · Ayah 255')).toBeTruthy();
    expect(within(only).queryByText('Yesterday')).toBeNull();
  });

  it('labels a card with its page, surah and position', async () => {
    setLog([entry(42, 2, 1, '255')]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getByLabelText('Page 42 · Surah 2 · Ayah 255')).toBeTruthy();
  });

  it('passes the whole recorded position when the card is pressed', async () => {
    setLog([entry(42, 2, 1, '255')]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const [only] = screen.getAllByTestId('quran-session-card');

    await fireEvent.press(only);

    expect(mockOnOpen).toHaveBeenCalledWith({
      page: 42,
      surah: 2,
      ayahKey: '255',
    });
  });

  it('shows one of four gauges complete once the page goal is done', async () => {
    setLog([entry(42, 2, 0)]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getByText('1 of 4 gauges complete')).toBeTruthy();
  });

  it('counts the summary from zero while goals are open', async () => {
    // Yesterday alone leaves today empty, so the goal stays open.
    setLog([entry(604, 114, 1)]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getByText('0 of 4 gauges complete')).toBeTruthy();
  });

  it('shows one line instead of a labelled void when the log is empty', async () => {
    setLog([]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.queryByTestId('quran-session-card')).toBeNull();
    expect(screen.queryByTestId(/^practice-gauge-/)).toBeNull();
    expect(screen.getByText('Your last page will appear here')).toBeTruthy();
  });

  it('shows the seed without a sample label or claiming it as the current position', async () => {
    setLog(SEED_READING_LOG);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    expect(screen.getByText('Resume reading')).toBeTruthy();
    expect(screen.queryByText('Sample history')).toBeNull();
    // No block claims the reader is on the seed's last page.
    expect(screen.queryByText('Continue reading')).toBeNull();

    const cards = screen.getAllByTestId('quran-session-card');
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText('Page 604 · Yesterday')).toBeTruthy();
    expect(within(cards[0]).getByText('Surah 114')).toBeTruthy();

    // The seed ends yesterday, so today still reads zero and stays open.
    const [first] = gauges();
    expect(within(first).getByText('0')).toBeTruthy();
    expect(screen.getByText('0 of 4 gauges complete')).toBeTruthy();
  });

  it('stays label-free after a real reading joins the seed', async () => {
    setLog([entry(42, 2, 0), ...SEED_READING_LOG]);

    await render(<ResumeBand onOpen={mockOnOpen} />);

    const cards = screen.getAllByTestId('quran-session-card');
    expect(within(cards[0]).getByText('Page 42 · Today')).toBeTruthy();
    expect(within(cards[0]).getByText('Surah 2')).toBeTruthy();
    expect(screen.queryByText('Sample history')).toBeNull();
  });

  it('does not render the old hizb band', async () => {
    setLog([entry(42, 2, 0)]);

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
    setLog([entry(604, 114, 1)]);
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
    setLog([entry(604, 114, 1)]);
    mockSurahs = {};

    await render(
      <QueryClientProvider client={queryClient}>
        <ResumeBand onOpen={mockOnOpen} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Surah 114')).toBeTruthy();
  });
});
