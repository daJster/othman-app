import { fireEvent, render, screen } from '@testing-library/react-native';
import type { QuranEdition } from '@/core/types';
import { HistoryBand } from '@/features/quran/components/history-band';
import { HistoryScreen } from '@/features/quran/history-content/history-screen';
import { HISTORY_MILESTONES } from '@/features/quran/history-content/timeline';

/**
 * The history entry band and page.
 *
 * The band's contract is the plate it shows and where it sends the reader; the
 * page's contract is that every milestone it renders carries a non-empty,
 * checkable source. The copy itself is not asserted here — the data file is the
 * single place to review it.
 */
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockPage = 12;
let mockEdition: QuranEdition | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('expo-router/head', () => () => null);

jest.mock('@/features/quran/store/use-reader', () => ({
  useReaderPage: () => mockPage,
  useReaderEdition: () => mockEdition,
}));

const EDITION: QuranEdition = {
  key: '1',
  name: 'Madani',
  riwaya: 'Hafs',
  baseUrl: 'https://cdn.test/1',
  bboxUrl: 'https://cdn.test/1/bbox.json',
  bboxReversedUrl: 'https://cdn.test/1/bbox_reversed.json',
  bboxNormUrl: 'https://cdn.test/1/bbox_norm.json',
  bboxReversedNormUrl: 'https://cdn.test/1/bbox_reversed_norm.json',
  firstPage: 1,
  lastPage: 604,
  themeColor: '#ffffff',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPage = 12;
  mockEdition = null;
});

describe('HistoryBand', () => {
  it('renders the fallback plate with the current page and the band copy', async () => {
    await render(<HistoryBand />);

    expect(screen.getByTestId('quran-history-band')).toBeTruthy();
    expect(screen.getByText("The mushaf's journey")).toBeTruthy();
    expect(screen.getByText('How the mushaf came to be')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByLabelText(/Quran page 12/)).toBeTruthy();
  });

  it('opens the history route from the whole band', async () => {
    await render(<HistoryBand />);

    await fireEvent.press(screen.getByTestId('quran-history-band'));

    expect(mockPush).toHaveBeenCalledWith('/quran/history');
  });

  it('uses the current page scan when an edition is attached', async () => {
    mockEdition = EDITION;

    await render(<HistoryBand />);

    // `expo-image` normalises `source` to an array before it reaches the host.
    expect(
      screen.getByTestId('quran-history-plate-image').props.source,
    ).toEqual([{ uri: 'https://cdn.test/1/pages/012.png' }]);
  });

  it('falls back when the stored page is outside the edition', async () => {
    mockEdition = EDITION;
    mockPage = 700;

    await render(<HistoryBand />);

    expect(screen.queryByTestId('quran-history-plate-image')).toBeNull();
    expect(screen.getByText('700')).toBeTruthy();
  });
});

describe('HistoryScreen', () => {
  it('renders four milestones and a non-empty source for each', async () => {
    await render(<HistoryScreen />);

    expect(HISTORY_MILESTONES).toHaveLength(4);

    for (const milestone of HISTORY_MILESTONES) {
      expect(
        screen.getByTestId(`quran-history-milestone-${milestone.id}`),
      ).toBeTruthy();

      const source = screen.getByTestId(`quran-history-source-${milestone.id}`);
      const rendered = source.props.children.join('');

      expect(milestone.source.trim()).not.toBe('');
      expect(rendered).toContain(milestone.source);
    }
  });

  it('leaves the page from the header back control', async () => {
    await render(<HistoryScreen />);

    await fireEvent.press(screen.getByTestId('quran-history-back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
