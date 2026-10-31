import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import type { AsyncState } from '@/features/query/async-state';
import ProgressScreen from '@/app/account/progress';

/**
 * The screen is tested against a faked query hook: `surah-progress.test.ts` and
 * `surah-heatmap.test.tsx` already cover the maths and the grid, so what is left
 * here is this screen's own contract — the four states, the selection round trip
 * with the detail sheet, and the back control.
 *
 * `Head` needs a navigation container (it reads `useIsFocused`), which says
 * nothing about this screen, so it is stubbed out.
 */
const mockUseSurahProgress = jest.fn();
const mockBack = jest.fn();
// Stable, like the real `useRouter()`: a new object per render would re-run
// effects that depend on it.
const mockRouter = { push: jest.fn(), back: mockBack };

jest.mock('@/features/progress/use-surah-progress', () => ({
  useSurahProgress: () => mockUseSurahProgress(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/account/progress',
  Redirect: () => null,
}));

jest.mock('expo-router/head', () => () => null);

jest.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { uid: 'uid-1' },
    status: 'signed-in',
  }),
}));

const ROWS: SurahProgress[] = [
  { surahNumber: 1, percent: 100, lastReviewed: '2026-10-01' },
  { surahNumber: 2, percent: 50, lastReviewed: '2026-10-05' },
  { surahNumber: 3, percent: 0, lastReviewed: null },
];

function given(state: AsyncState<SurahProgress[]>, isFetching = false) {
  mockUseSurahProgress.mockReturnValue({ state, isFetching });
}

beforeEach(() => {
  mockUseSurahProgress.mockReset();
  mockBack.mockReset();
});

describe('ProgressScreen', () => {
  it('shows the loading state while the rows are in flight', async () => {
    given({ status: 'pending' });

    await render(<ProgressScreen />);

    expect(screen.getByText('Loading…')).toBeTruthy();
    // "Empty" must never be shown while the answer is still unknown.
    expect(screen.queryByText('No progress recorded yet.')).toBeNull();
  });

  it('reports nothing recorded without drawing a grey grid', async () => {
    given({ status: 'empty' });

    await render(<ProgressScreen />);

    expect(screen.getByText('No progress recorded yet.')).toBeTruthy();
    expect(screen.queryByTestId('surah-heatmap')).toBeNull();
  });

  it('offers the query retry when the read fails', async () => {
    const retry = jest.fn();
    given({ status: 'error', error: new Error('offline'), retry });

    await render(<ProgressScreen />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();

    await fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('summarizes the same rows the grid draws', async () => {
    given({ status: 'ready', data: ROWS });

    await render(<ProgressScreen />);

    // 100, 50 and 0 average to 50.
    expect(screen.getByTestId('progress-average')).toHaveTextContent('50%');
    expect(screen.getByTestId('progress-stat:memorised')).toHaveTextContent(
      '1',
    );
    expect(screen.getByTestId('progress-stat:started')).toHaveTextContent('2');
    expect(screen.getByTestId('progress-stat:total')).toHaveTextContent('3');
    expect(screen.getByTestId('progress-grid-title')).toHaveTextContent(
      'Surahs',
    );
    expect(screen.getAllByTestId(/^surah-cell:/)).toHaveLength(3);
  });

  it('opens the detail sheet for the tapped surah and closes it', async () => {
    given({ status: 'ready', data: ROWS });

    await render(<ProgressScreen />);

    expect(screen.queryByTestId('surah-detail-sheet')).toBeNull();

    await fireEvent.press(screen.getByTestId('surah-cell:2'));

    const sheet = screen.getByTestId('surah-detail-sheet');
    expect(within(sheet).getByText('Surah 2')).toBeTruthy();
    expect(within(sheet).getByText('In progress')).toBeTruthy();
    expect(within(sheet).getByText('50%')).toBeTruthy();
    expect(within(sheet).getByText(/Last reviewed/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('surah-detail-close'));

    expect(screen.queryByTestId('surah-detail-sheet')).toBeNull();
  });

  it('says a never-reviewed surah has no review date', async () => {
    given({ status: 'ready', data: ROWS });

    await render(<ProgressScreen />);

    await fireEvent.press(screen.getByTestId('surah-cell:3'));

    const sheet = screen.getByTestId('surah-detail-sheet');
    expect(within(sheet).getByText('Not started')).toBeTruthy();
    expect(within(sheet).getByText('Not reviewed yet')).toBeTruthy();
  });

  it('leaves the screen from the back control', async () => {
    given({ status: 'pending' });

    await render(<ProgressScreen />);

    await fireEvent.press(screen.getByTestId('progress-back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
