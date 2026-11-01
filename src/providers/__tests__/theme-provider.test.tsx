import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { Uniwind } from 'uniwind';
import { STORAGE_KEYS, storageService } from '@/platform/storage';
import { ThemeProvider, useThemeMode } from '@/providers/theme-provider';

/**
 * The provider talks to two things outside React: storage and Uniwind. Both are
 * mocked here, so these tests describe the hydration contract ("read, apply,
 * report ready") instead of a particular backend. The splash gate moved to
 * `BootProvider` in P2.3 and is tested there.
 */
jest.mock('@/platform/storage', () => {
  const store = new Map<string, unknown>();

  return {
    STORAGE_KEYS: {
      theme: 'theme',
      language: 'language',
      quranEdition: 'quranreader:edition',
      lastVisitedPage: 'lastVisitedPage',
    },
    storageService: {
      getItem: jest.fn(async (key: string, fallback: unknown) =>
        store.has(key) ? store.get(key) : fallback,
      ),
      setItem: jest.fn(async (key: string, value: unknown) => {
        store.set(key, value);
        return true;
      }),
      removeItem: jest.fn(async () => true),
      clear: jest.fn(async () => true),
    },
    __store: store,
  };
});

const storage = storageService as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
};

function Consumer() {
  const { mode, isDark, ready, setMode } = useThemeMode();

  return (
    <View>
      <Text testID="mode">{mode}</Text>
      <Text testID="scheme">{isDark ? 'dark' : 'light'}</Text>
      <Text testID="ready">{ready ? 'ready' : 'pending'}</Text>
      <Text testID="to-dark" onPress={() => setMode('dark')}>
        to dark
      </Text>
    </View>
  );
}

function renderProvider(ui = <Consumer />) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockImplementation(
    async (_key: string, fallback: unknown) => fallback,
  );
});

describe('ThemeProvider', () => {
  it('renders children before hydration and flips `ready` once applied', async () => {
    let release!: (value: unknown) => void;
    storage.getItem.mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve)),
    );

    await renderProvider();

    // The gate lives in BootProvider, so children mount immediately and can
    // observe the pending state instead of seeing an empty tree.
    expect(screen.getByTestId('ready').props.children).toBe('pending');

    release('dark');

    await waitFor(() =>
      expect(screen.getByTestId('ready').props.children).toBe('ready'),
    );
    expect(screen.getByTestId('mode').props.children).toBe('dark');
  });

  it('applies the stored mode before revealing the app', async () => {
    storage.getItem.mockResolvedValueOnce('light');
    const setTheme = jest.spyOn(Uniwind, 'setTheme');

    await renderProvider();
    await screen.findByTestId('mode');

    expect(setTheme).toHaveBeenCalledWith('light');
    expect(screen.getByTestId('mode').props.children).toBe('light');
    expect(screen.getByTestId('ready').props.children).toBe('ready');
    // Hydration reads; it never writes the value it just read.
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('falls back to system for a missing or unknown stored value', async () => {
    storage.getItem.mockResolvedValueOnce('sepia');
    const setTheme = jest.spyOn(Uniwind, 'setTheme');

    await renderProvider();
    await screen.findByTestId('mode');

    expect(setTheme).toHaveBeenCalledWith('system');
    expect(screen.getByTestId('mode').props.children).toBe('system');
  });

  it('reads the mode under the shared storage key', async () => {
    await renderProvider();
    await screen.findByTestId('mode');

    expect(storage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.theme, 'system');
  });

  it('switches immediately and persists the new mode', async () => {
    const setTheme = jest.spyOn(Uniwind, 'setTheme');
    await renderProvider();
    await screen.findByTestId('mode');

    fireEvent.press(screen.getByTestId('to-dark'));

    expect(setTheme).toHaveBeenLastCalledWith('dark');
    await waitFor(() =>
      expect(screen.getByTestId('mode').props.children).toBe('dark'),
    );
    await waitFor(() =>
      expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.theme, 'dark'),
    );
  });

  it('reports the resolved scheme for a pinned mode', async () => {
    storage.getItem.mockResolvedValueOnce('dark');

    await renderProvider();
    await screen.findByTestId('mode');

    expect(screen.getByTestId('scheme').props.children).toBe('dark');
  });
});
