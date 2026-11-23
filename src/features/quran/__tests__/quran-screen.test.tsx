import { fireEvent, render, screen } from '@testing-library/react-native';
import QuranScreen from '@/app/(tabs)/quran';

/**
 * The tab is the reader itself. There is no landing surface between the tab
 * trigger and the mushaf, so the test only needs to prove three things:
 *
 *  - the reader mounts as the tab's own screen (embedded, signed-in notes
 *    namespace, no landing bands);
 *  - a position link still forwards to the reader route instead of being
 *    applied to a half-booted reader;
 *  - a malformed link degrades to the recoverable error screen.
 *
 * `ReaderScreen` is stubbed because its own boot order, states and gestures are
 * covered by `reader-screen.test.tsx`; here the contract is *which* screen the
 * tab renders.
 */
const mockReplace = jest.fn();
const mockParams = jest.fn<Record<string, string | string[] | undefined>, []>(
  () => ({}),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams(),
}));

jest.mock('expo-router/head', () => () => null);

jest.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('@/features/quran/reader-screen', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    ReaderScreen: ({
      embedded,
      notesNamespace,
    }: {
      embedded?: boolean;
      notesNamespace?: string;
    }) =>
      React.createElement(
        Text,
        { testID: 'reader-screen' },
        `${String(embedded)}:${notesNamespace}`,
      ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({});
});

describe('QuranScreen', () => {
  it('renders the reader directly, with no landing surface', async () => {
    await render(<QuranScreen />);

    expect(screen.getByTestId('reader-screen')).toBeTruthy();
    expect(screen.getByText('true:user:u1')).toBeTruthy();

    // The old landing page and its bands are gone.
    expect(screen.queryAllByTestId(/quran-.*-band/)).toHaveLength(0);
    expect(screen.queryByTestId('quran-records-entry')).toBeNull();
  });

  it('forwards a surah/ayah link to the reader instead of mounting it early', async () => {
    mockParams.mockReturnValue({ surah: '2', ayah: '255' });

    await render(<QuranScreen />);

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/reader/[page]',
      params: { page: '1', surah: '2', ayah: '255' },
    });
    expect(screen.queryByTestId('reader-screen')).toBeNull();
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
