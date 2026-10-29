import { fireEvent, render, screen } from '@testing-library/react-native';
import type { EditionBboxes, QuranEdition } from '@/core/types';
import { readerStore } from '../store/reader-store.instance';
import { ReaderScreen } from '../reader-screen';

/**
 * The reader screen's own contract: the boot order, the four states, the deep
 * link, and the round trip from an ayah tap to the store.
 *
 * The server reads are mocked at the hook boundary (the query contract is
 * covered by `quran-queries.test.tsx`), and the reader store is the real
 * singleton, reset between cases. That is deliberate: the thing most likely to
 * break here is the *wiring* between a resolved query and `attachEdition`, and
 * faking the store would hide exactly that.
 */

const mockRouter = {
  canGoBack: jest.fn(() => true),
  back: jest.fn(),
  replace: jest.fn(),
};

const mockUseQuranCatalog = jest.fn();
const mockUseEditionBboxes = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('../use-quran-catalog', () => ({
  useQuranCatalog: () => mockUseQuranCatalog(),
}));

jest.mock('../use-edition-bboxes', () => ({
  useEditionBboxes: (edition: unknown) => mockUseEditionBboxes(edition),
}));

jest.mock('../use-page-prefetch', () => ({
  usePagePrefetch: () => undefined,
}));

const EDITION_1: QuranEdition = {
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

const EDITION_2: QuranEdition = {
  ...EDITION_1,
  key: '2',
  name: 'MedinaOld',
  baseUrl: 'https://cdn.test/2',
  firstPage: 4,
  lastPage: 605,
};

const CATALOG = {
  editions: { '1': EDITION_1, '2': EDITION_2 },
  surahs: {},
};

const BOX = { top: 0.1, left: 0.1, bottom: 0.2, right: 0.9 };

function pageRow(absoluteNumber: number, surahNumber: number) {
  return { absoluteNumber, surahNumber, bboxes: [BOX] };
}

const BBOXES: EditionBboxes = {
  byPage: {
    '1': { '1': pageRow(1, 1) },
    '12': { '1': pageRow(100, 2) },
    '604': { '1': pageRow(6000, 114) },
  },
  bySurah: {
    '1': { '1': { absoluteNumber: 1, pageNumber: 1, bboxes: [BOX] } },
  },
};

/** A resolved result whose `data` identity is stable across renders. */
const catalogReady = {
  state: { status: 'ready' as const, data: CATALOG },
  isFetching: false,
};

const bboxesReady = {
  state: { status: 'ready' as const, data: BBOXES },
  isFetching: false,
};

beforeEach(() => {
  mockRouter.canGoBack.mockReset().mockReturnValue(true);
  mockRouter.back.mockReset();
  mockRouter.replace.mockReset();

  mockUseQuranCatalog.mockReset();
  mockUseEditionBboxes.mockReset();

  readerStore.setState(readerStore.getInitialState(), true);
  // Storage is not under test here: start as if `restore()` had already run.
  readerStore.setState({ restored: true, preferredEditionKey: '1' });
});

describe('ReaderScreen boot', () => {
  it('waits for the stored preference before asking for an edition', async () => {
    // A restore that never settles: the point is the frame *before* storage
    // answers, which is where resolving an edition would fetch the wrong tables.
    readerStore.setState({
      restored: false,
      restore: () => new Promise<void>(() => {}),
    });
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue(bboxesReady);

    await render(<ReaderScreen />);

    expect(screen.getByTestId('reader-loading')).toBeTruthy();
    expect(mockUseEditionBboxes).not.toHaveBeenCalled();
  });

  it('shows the catalog loading state', async () => {
    mockUseQuranCatalog.mockReturnValue({
      state: { status: 'pending' },
      isFetching: true,
    });
    mockUseEditionBboxes.mockReturnValue(bboxesReady);

    await render(<ReaderScreen />);

    expect(screen.getByTestId('reader-loading')).toBeTruthy();
    expect(screen.queryByTestId('mushaf-image')).toBeNull();
  });

  it('offers a retry when the catalog fails', async () => {
    const retry = jest.fn();
    mockUseQuranCatalog.mockReturnValue({
      state: { status: 'error', error: new Error('offline'), retry },
      isFetching: false,
    });

    await render(<ReaderScreen />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();

    await fireEvent.press(screen.getByText('Try again'));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('loads the stored edition, not the first one', async () => {
    readerStore.setState({ preferredEditionKey: '2' });
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue(bboxesReady);

    await render(<ReaderScreen />);

    expect(mockUseEditionBboxes).toHaveBeenCalledWith(EDITION_2);
  });

  it('renders the page the reader store restored', async () => {
    readerStore.setState({ preferredEditionKey: '2', restoredPage: 12 });
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue(bboxesReady);

    await render(<ReaderScreen />);

    expect(screen.getByTestId('mushaf-page:12')).toBeTruthy();
    expect(screen.getByTestId('mushaf-image').props.source).toEqual([
      { uri: 'https://cdn.test/2/pages/012.png' },
    ]);
  });

  it('shows the bbox loading state separately from the catalog', async () => {
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue({
      state: { status: 'pending' },
      isFetching: true,
    });

    await render(<ReaderScreen />);

    expect(screen.getByTestId('reader-loading')).toBeTruthy();
    expect(screen.queryByTestId('mushaf-image')).toBeNull();
  });

  it('retries a failed bbox download without reloading the catalog', async () => {
    const retry = jest.fn();
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue({
      state: { status: 'error', error: new Error('offline'), retry },
      isFetching: false,
    });

    await render(<ReaderScreen />);
    await fireEvent.press(screen.getByText('Try again'));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('ReaderScreen deep link', () => {
  beforeEach(() => {
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue(bboxesReady);
  });

  it('opens the linked page instead of the stored one', async () => {
    readerStore.setState({ restoredPage: 1 });

    await render(<ReaderScreen initialPage={12} />);

    expect(screen.getByTestId('mushaf-page:12')).toBeTruthy();
    expect(readerStore.getState().page).toBe(12);
  });

  it('clamps a page the edition does not have', async () => {
    await render(<ReaderScreen initialPage={9999} />);

    expect(readerStore.getState().page).toBe(604);
    expect(screen.getByTestId('mushaf-page:604')).toBeTruthy();
  });

  it('keeps the stored page when the link carries no page', async () => {
    readerStore.setState({ restoredPage: 12 });

    await render(<ReaderScreen />);

    expect(readerStore.getState().page).toBe(12);
    expect(screen.getByTestId('mushaf-page:12')).toBeTruthy();
  });
});

describe('ReaderScreen selection', () => {
  beforeEach(() => {
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue(bboxesReady);
  });

  it('selects an ayah from a tap on its box', async () => {
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('ayah:1:0'));

    expect(readerStore.getState().ayahKey).toBe('1');
    expect(
      screen.getByTestId('ayah:1:0').props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('clears the selection when the margin is tapped', async () => {
    await render(<ReaderScreen />);
    await fireEvent.press(screen.getByTestId('ayah:1:0'));

    await fireEvent.press(screen.getByTestId('ayah-overlay-backdrop'));

    expect(readerStore.getState().ayahKey).toBeNull();
  });
});

describe('ReaderScreen exit', () => {
  beforeEach(() => {
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue(bboxesReady);
  });

  it('goes back when there is history', async () => {
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('reader-back'));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('falls back to the Quran tab when the reader was opened by link', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('reader-back'));

    expect(mockRouter.replace).toHaveBeenCalledWith('/quran');
  });
});
