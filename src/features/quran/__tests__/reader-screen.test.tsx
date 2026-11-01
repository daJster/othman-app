import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { render } from '@/test-utils/render';
import { Share } from 'react-native';
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
  setParams: jest.fn(),
};

const mockUseQuranCatalog = jest.fn();
const mockUseEditionBboxes = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

// The menu's theme row belongs to the settings feature and needs the
// ThemeProvider; this suite is about the reader, so the row is stubbed.
jest.mock('@/features/settings/theme-dropdown', () => ({
  ThemeDropdown: () => null,
}));

// The sheets are native presentations; the interaction tests need their rows.
// The audio controls are reduced to pressables that report their next value.
jest.mock('@expo/ui', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');

  const Picker = ({ children }: { children?: unknown }) =>
    React.createElement(React.Fragment, null, children as never);
  function PickerItem({ label }: { label: string }) {
    return React.createElement(Text, null, label);
  }
  Picker.Item = PickerItem;

  return {
    BottomSheet: ({
      isPresented,
      children,
    }: {
      isPresented?: boolean;
      children?: unknown;
    }) => (isPresented ? children : null),
    Host: ({ children }: { children?: unknown }) => children,
    RNHostView: ({ children }: { children?: unknown }) => children,
    Column: ({ children }: { children?: unknown }) => children,
    Slider: ({
      onValueChange,
      testID,
    }: {
      onValueChange: (value: number) => void;
      testID?: string;
    }) =>
      React.createElement(Pressable, {
        testID,
        onPress: () => onValueChange(42),
      }),
    Switch: ({
      value,
      onValueChange,
      testID,
    }: {
      value: boolean;
      onValueChange: (value: boolean) => void;
      testID?: string;
    }) =>
      React.createElement(Pressable, {
        testID,
        onPress: () => onValueChange(!value),
      }),
    Picker,
  };
});

const mockAudioPlayer = {
  replace: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(() => Promise.resolve()),
};

let mockAudioStatus: Record<string, unknown>;

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockAudioPlayer,
  useAudioPlayerStatus: () => mockAudioStatus,
  preload: jest.fn(),
  clearPreloadedSource: jest.fn(),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
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

const mockUseAyahContent = jest.fn();

jest.mock('../use-ayah-content', () => ({
  useAyahContent: (absoluteNumber: number | null) =>
    mockUseAyahContent(absoluteNumber),
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
  surahs: {
    '1': {
      number: 1,
      name: 'الفاتحة',
      nameEnglish: 'Al-Fatihah',
      location: 'makka',
      ayahCount: 7,
    },
    '2': {
      number: 2,
      name: 'البقرة',
      nameEnglish: 'Al-Baqarah',
      location: 'madina',
      ayahCount: 286,
    },
  },
};

const BOX = { top: 0.1, left: 0.1, bottom: 0.2, right: 0.9 };

function pageRow(absoluteNumber: number, surahNumber: number) {
  return { absoluteNumber, surahNumber, bboxes: [BOX] };
}

const BBOXES: EditionBboxes = {
  byPage: {
    '1': {
      '1': pageRow(1, 1),
      '2': pageRow(2, 1),
      '3': pageRow(3, 1),
      '4': pageRow(4, 1),
      '5': pageRow(5, 1),
      '6': pageRow(6, 1),
      '7': pageRow(7, 1),
    },
    '12': { '1': pageRow(100, 2) },
    '604': { '1': pageRow(6000, 114) },
  },
  bySurah: {
    '1': {
      '1': { absoluteNumber: 1, pageNumber: 1, bboxes: [BOX] },
      '2': { absoluteNumber: 2, pageNumber: 1, bboxes: [BOX] },
      '3': { absoluteNumber: 3, pageNumber: 1, bboxes: [BOX] },
      '4': { absoluteNumber: 4, pageNumber: 1, bboxes: [BOX] },
      '5': { absoluteNumber: 5, pageNumber: 1, bboxes: [BOX] },
      '6': { absoluteNumber: 6, pageNumber: 1, bboxes: [BOX] },
      '7': { absoluteNumber: 7, pageNumber: 1, bboxes: [BOX] },
    },
    '2': { '1': { absoluteNumber: 8, pageNumber: 12, bboxes: [BOX] } },
  },
};

const BBOXES_2: EditionBboxes = {
  byPage: {
    '4': { '1': pageRow(8, 2) },
    '12': { '1': pageRow(100, 2) },
  },
  bySurah: {
    '2': { '1': { absoluteNumber: 8, pageNumber: 4, bboxes: [BOX] } },
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
  mockRouter.setParams.mockReset();

  mockAudioPlayer.replace.mockReset();
  mockAudioPlayer.play.mockReset();
  mockAudioPlayer.pause.mockReset();
  mockAudioPlayer.seekTo.mockReset().mockResolvedValue(undefined);
  mockAudioStatus = {
    id: 'player',
    currentTime: 0,
    playbackState: 'readyToPlay',
    timeControlStatus: 'paused',
    reasonForWaitingToPlay: '',
    mute: false,
    duration: 0,
    playing: false,
    loop: false,
    didJustFinish: false,
    isBuffering: false,
    isLoaded: false,
    playbackRate: 1,
    shouldCorrectPitch: true,
    isLive: false,
    currentOffsetFromLive: null,
    error: null,
  };

  mockUseQuranCatalog.mockReset();
  mockUseEditionBboxes.mockReset();
  mockUseAyahContent.mockReset();
  mockUseAyahContent.mockReturnValue({
    state: {
      status: 'ready',
      data: {
        absoluteNumber: 1,
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        numberInSurah: 1,
        juz: 1,
        manzil: 1,
        page: 1,
        ruku: 1,
        hizbQuarter: 1,
        sajda: false,
      },
    },
    isFetching: false,
  });

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

  it('attaches late bbox data without moving the restored page', async () => {
    readerStore.setState({ restoredPage: 12 });
    mockUseQuranCatalog.mockReturnValue(catalogReady);

    // The page is already known, but its boxes are still in flight.
    mockUseEditionBboxes.mockReturnValue({
      state: { status: 'pending' },
      isFetching: true,
    });

    const view = await render(<ReaderScreen />);

    expect(screen.getByTestId('reader-loading')).toBeTruthy();
    expect(readerStore.getState().restoredPage).toBe(12);

    mockUseEditionBboxes.mockReturnValue(bboxesReady);
    await view.rerender(<ReaderScreen />);

    // Attaching supplies the measurements; it must not reset navigation.
    expect(readerStore.getState().page).toBe(12);
    expect(screen.getByTestId('mushaf-page:12')).toBeTruthy();
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

  it('lets the ayah mapping win over a contradictory page', async () => {
    await render(
      <ReaderScreen initialPage={1} initialSurah={2} initialAyah={1} />,
    );

    expect(readerStore.getState().page).toBe(12);
    expect(readerStore.getState().surah).toBe(2);
    expect(readerStore.getState().ayahKey).toBe('1');
    expect(screen.getByTestId('mushaf-page:12')).toBeTruthy();
  });

  it('recovers from an ayah the edition does not have', async () => {
    await render(
      <ReaderScreen initialPage={1} initialSurah={2} initialAyah={99} />,
    );

    await waitFor(() =>
      expect(screen.getByText('This link is not valid')).toBeTruthy(),
    );

    // The header stays reachable; the retry leaves via the Quran tab.
    expect(screen.getByTestId('reader-header')).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));

    expect(mockRouter.replace).toHaveBeenCalledWith('/quran');
  });

  it('applies the link once, so a later page turn sticks', async () => {
    const view = await render(<ReaderScreen initialPage={12} />);

    await fireEvent.press(screen.getByTestId('reader-next'));
    expect(readerStore.getState().page).toBe(13);

    await view.rerender(<ReaderScreen initialPage={12} />);

    expect(readerStore.getState().page).toBe(13);
  });

  it('keeps the route segment in sync with the page', async () => {
    await render(<ReaderScreen initialPage={12} />);

    await fireEvent.press(screen.getByTestId('reader-next'));

    await waitFor(() =>
      expect(mockRouter.setParams).toHaveBeenCalledWith({
        page: '13',
        surah: undefined,
        ayah: undefined,
      }),
    );
  });

  it('does not re-apply the link after an edition switch remounts the body', async () => {
    mockUseEditionBboxes.mockImplementation((edition: QuranEdition) =>
      edition.key === '2'
        ? { state: { status: 'ready', data: BBOXES_2 }, isFetching: false }
        : bboxesReady,
    );

    await render(<ReaderScreen initialPage={1} />);

    expect(readerStore.getState().page).toBe(1);

    // Edition 2 starts at page 4, so the switch clamps the position.
    await fireEvent.press(screen.getByTestId('reader-edition'));
    await fireEvent.press(screen.getByTestId('edition-row:2'));
    await waitFor(() => expect(readerStore.getState().page).toBe(4));

    // Switching back must keep the reader's new position. A per-body link flag
    // would have been reset by the remount and jumped back to page 1.
    await fireEvent.press(screen.getByTestId('reader-edition'));
    await fireEvent.press(screen.getByTestId('edition-row:1'));
    await waitFor(() => expect(readerStore.getState().editionKey).toBe('1'));

    expect(readerStore.getState().page).toBe(4);
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

describe('ReaderScreen chrome', () => {
  beforeEach(() => {
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue(bboxesReady);
  });

  it('hides and restores the chrome from the margin, without a selection', async () => {
    await render(<ReaderScreen />);

    expect(screen.getByTestId('reader-header')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('ayah-overlay-backdrop'));

    expect(screen.queryByTestId('reader-header')).toBeNull();
    expect(screen.queryByTestId('reader-footer')).toBeNull();

    await fireEvent.press(screen.getByTestId('ayah-overlay-backdrop'));

    expect(screen.getByTestId('reader-header')).toBeTruthy();
  });

  it('clears a selected ayah instead of hiding the chrome', async () => {
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('ayah:1:0'));
    await fireEvent.press(screen.getByTestId('ayah-overlay-backdrop'));

    expect(readerStore.getState().ayahKey).toBeNull();
    // The same tap must not also hide the controls.
    expect(screen.getByTestId('reader-header')).toBeTruthy();
  });

  it('turns pages from the footer and disables the boundary', async () => {
    await render(<ReaderScreen />);

    expect(
      screen.getByTestId('reader-prev').props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByTestId('reader-next'));

    expect(readerStore.getState().page).toBe(2);
    expect(screen.getByText('Page 2')).toBeTruthy();
  });

  it('jumps to a surah from the searchable picker', async () => {
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('reader-surah'));
    await fireEvent.press(screen.getByTestId('surah-row:2'));

    expect(readerStore.getState().page).toBe(12);
    expect(readerStore.getState().surah).toBe(2);
    expect(screen.getByText('Al-Baqarah')).toBeTruthy();
    // The sheet is dismissed, so the scan is uncovered again.
    expect(screen.queryByTestId('surah-search')).toBeNull();
  });

  it('opens the Read panel with the selected ayah content', async () => {
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('ayah:1:0'));

    expect(mockUseAyahContent).toHaveBeenLastCalledWith(1);

    await fireEvent.press(screen.getByTestId('reader-menu'));
    await fireEvent.press(screen.getByTestId('reader-menu-read'));

    expect(screen.getByTestId('ayah-block:quran').props.children).toContain(
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    );
    // The chrome keeps the selection the panel is about.
    expect(readerStore.getState().ayahKey).toBe('1');
  });

  it('shares the canonical position through the menu', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
      activityType: undefined,
    });

    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('ayah:1:0'));
    await fireEvent.press(screen.getByTestId('reader-menu'));
    await fireEvent.press(screen.getByTestId('reader-menu-share'));

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('surah=1&ayah=1'),
      }),
    );

    share.mockRestore();
  });

  it('switches edition only after the new geometry resolves', async () => {
    mockUseEditionBboxes.mockImplementation((edition: QuranEdition) =>
      edition.key === '2'
        ? { state: { status: 'pending' }, isFetching: true }
        : bboxesReady,
    );

    const view = await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('reader-edition'));
    await fireEvent.press(screen.getByTestId('edition-row:2'));

    // Still the old edition: the new one's boxes are not attached yet.
    expect(readerStore.getState().editionKey).toBe('1');
    expect(screen.getByTestId('reader-loading')).toBeTruthy();

    mockUseEditionBboxes.mockReturnValue({
      state: { status: 'ready', data: BBOXES_2 },
      isFetching: false,
    });
    await view.rerender(<ReaderScreen />);

    expect(readerStore.getState().editionKey).toBe('2');
    // Page 1 is outside edition 2's range (4–605), so the store clamps it.
    expect(readerStore.getState().page).toBe(4);
    expect(screen.getByTestId('mushaf-image').props.source).toEqual([
      { uri: 'https://cdn.test/2/pages/004.png' },
    ]);
  });

  it('keeps the newest edition when an older request resolves late', async () => {
    mockUseEditionBboxes.mockImplementation((edition: QuranEdition) =>
      edition.key === '2'
        ? { state: { status: 'pending' }, isFetching: true }
        : bboxesReady,
    );

    const view = await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('reader-edition'));
    await fireEvent.press(screen.getByTestId('edition-row:2'));

    // The reader changes their mind before edition 2 answers.
    await fireEvent.press(screen.getByTestId('reader-edition'));
    await fireEvent.press(screen.getByTestId('edition-row:1'));

    expect(readerStore.getState().editionKey).toBe('1');

    // Edition 2's data arriving afterwards must not steal the selection.
    mockUseEditionBboxes.mockReturnValue({
      state: { status: 'ready', data: BBOXES_2 },
      isFetching: false,
    });
    await view.rerender(<ReaderScreen />);

    expect(readerStore.getState().editionKey).toBe('1');
    expect(screen.getByTestId('mushaf-image').props.source).toEqual([
      { uri: 'https://cdn.test/1/pages/001.png' },
    ]);
  });

  it('keeps the exit action reachable while the chrome is visible', async () => {
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('reader-back'));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

describe('ReaderScreen audio', () => {
  beforeEach(() => {
    mockUseQuranCatalog.mockReturnValue(catalogReady);
    mockUseEditionBboxes.mockReturnValue(bboxesReady);
  });

  it('opens the audio panel for the selected ayah and loads that source', async () => {
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('ayah:1:0'));
    await fireEvent.press(screen.getByTestId('reader-menu'));
    await fireEvent.press(screen.getByTestId('reader-menu-audio'));

    expect(screen.getByTestId('audio-identity').props.children).toContain(
      'Al-Fatihah',
    );

    // One player whose source is replaced, keyed by the absolute ayah.
    expect(mockAudioPlayer.replace).toHaveBeenLastCalledWith({
      uri: expect.stringMatching(/\/ar\.husarymujawwad\/1\.mp3$/),
    });
  });

  it('steps one ayah at a time from the panel', async () => {
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('ayah:1:0'));
    await fireEvent.press(screen.getByTestId('reader-menu'));
    await fireEvent.press(screen.getByTestId('reader-menu-audio'));

    // The first ayah has nowhere to go backwards without wrap.
    expect(
      screen.getByTestId('audio-prev').props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await fireEvent.press(screen.getByTestId('audio-next'));

    expect(readerStore.getState().ayahKey).toBe('2');
    expect(mockAudioPlayer.replace).toHaveBeenLastCalledWith({
      uri: expect.stringMatching(/\/ar\.husarymujawwad\/2\.mp3$/),
    });
  });

  it('auto-advances once when a source finishes', async () => {
    const view = await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('ayah:1:0'));
    await fireEvent.press(screen.getByTestId('reader-menu'));
    await fireEvent.press(screen.getByTestId('reader-menu-audio'));

    mockAudioStatus = { ...mockAudioStatus, isLoaded: true, duration: 10 };
    await view.rerender(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('audio-auto-read'));

    mockAudioStatus = { ...mockAudioStatus, didJustFinish: true };
    await view.rerender(<ReaderScreen />);
    await view.rerender(<ReaderScreen />);

    await waitFor(() => expect(readerStore.getState().ayahKey).toBe('2'));
    // A repeated completion frame must not skip to the third ayah.
    expect(readerStore.getState().ayahKey).toBe('2');
  });

  it('keeps playing when the panel closes', async () => {
    await render(<ReaderScreen />);

    await fireEvent.press(screen.getByTestId('ayah:1:0'));
    await fireEvent.press(screen.getByTestId('reader-menu'));
    await fireEvent.press(screen.getByTestId('reader-menu-audio'));
    await fireEvent.press(screen.getByTestId('audio-close'));

    expect(screen.queryByTestId('audio-identity')).toBeNull();
    // Closing the sheet is not a source change: the player was not torn down.
    expect(mockAudioPlayer.replace).toHaveBeenCalledTimes(1);
  });
});
