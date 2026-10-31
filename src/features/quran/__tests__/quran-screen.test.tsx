import { fireEvent, render, screen } from '@testing-library/react-native';
import QuranScreen from '@/app/(tabs)/quran';

/**
 * The tab is a launch surface, not a second reader: it must open the existing
 * `/reader/[page]` route at the restored page. That mapping is the only thing
 * this screen owns, so it is mocked at the store boundary instead of booting
 * the whole reader.
 */
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPage = jest.fn(() => 12);
const mockRestore = jest.fn();
const mockParams = jest.fn<Record<string, string | string[] | undefined>, []>(
  () => ({}),
);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: () => mockParams(),
}));

jest.mock('expo-router/head', () => () => null);

jest.mock('@/features/quran/store/use-reader', () => ({
  useRestoreReader: () => mockRestore(),
  useReaderPage: () => mockPage(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPage.mockReturnValue(12);
  mockParams.mockReturnValue({});
});

describe('QuranScreen', () => {
  it('shows the restored page and opens the reader route from it', async () => {
    await render(<QuranScreen />);

    expect(screen.getByText('Page 12')).toBeTruthy();
    expect(mockRestore).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('quran-open-reader'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reader/[page]',
      params: { page: '12' },
    });
  });

  it('opens page 1 before any stored position exists', async () => {
    mockPage.mockReturnValue(1);

    await render(<QuranScreen />);
    await fireEvent.press(screen.getByTestId('quran-open-reader'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reader/[page]',
      params: { page: '1' },
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

  it('shows a recoverable error for a malformed link', async () => {
    mockParams.mockReturnValue({ surah: '999' });

    await render(<QuranScreen />);

    expect(screen.getByText('This link is not valid')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Try again'));

    expect(mockReplace).toHaveBeenCalledWith('/quran');
  });
});
