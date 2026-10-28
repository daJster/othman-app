import { act, render, screen, waitFor } from '@testing-library/react-native';
import { I18nManager, Text } from 'react-native';
import { STORAGE_KEYS, storageService } from '@/platform/storage';
import { i18n, setLanguageState } from '@/i18n';
import {
  LanguageProvider,
  setLanguage,
  useLanguage,
} from '@/providers/language-provider';

/**
 * Language boot contract: read, reconcile, report ready — and make the switch
 * reach the i18next instance before the UI is allowed to render.
 *
 * Storage and `I18nManager` are the two edges mocked here. i18next itself is
 * real: the point of these tests is that `t()` and `direction` agree with the
 * stored value, which a mocked instance could not show.
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
  const {
    language,
    direction,
    isRTL,
    ready,
    setLanguage: change,
  } = useLanguage();

  return (
    <>
      <Text testID="language">{language}</Text>
      <Text testID="direction">{direction}</Text>
      <Text testID="rtl">{isRTL ? 'rtl' : 'ltr'}</Text>
      <Text testID="ready">{ready ? 'ready' : 'pending'}</Text>
      <Text testID="to-arabic" onPress={() => void change('ar')}>
        عربي
      </Text>
    </>
  );
}

async function renderProvider() {
  const view = await render(
    <LanguageProvider>
      <Consumer />
    </LanguageProvider>,
  );

  // Hydration runs in a microtask after mount. Flushing it inside `act` keeps
  // the store update inside React's test scope instead of warning about it.
  await act(async () => {});

  return view;
}

/**
 * The store is module state, so every test starts and ends in the same place.
 * Without this, a test that switches to Arabic leaves the next one with an
 * already-active language and `setLanguage` short-circuits.
 */
async function resetLanguage() {
  setLanguageState({ language: 'en', ready: true });
  await i18n.changeLanguage('en');
}

beforeEach(async () => {
  jest.clearAllMocks();
  storage.getItem.mockImplementation(
    async (_key: string, fallback: unknown) => fallback,
  );
  await resetLanguage();
});

afterEach(async () => {
  // Wrapped in `act` because the component under test may still be mounted when
  // the store is reset, and a store update is a React update.
  await act(async () => {
    await resetLanguage();
  });
});

describe('LanguageProvider', () => {
  it('applies a stored language before reporting ready', async () => {
    storage.getItem.mockResolvedValueOnce('ar');

    await renderProvider();
    await screen.findByText('ready');

    expect(screen.getByTestId('language').props.children).toBe('ar');
    expect(screen.getByTestId('direction').props.children).toBe('rtl');
    expect(screen.getByTestId('rtl').props.children).toBe('rtl');
    expect(i18n.language).toBe('ar');
  });

  it('reads the preference under the shared storage key', async () => {
    await renderProvider();
    await screen.findByText('ready');

    expect(storage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.language, null);
  });

  it('ignores an unsupported stored value', async () => {
    storage.getItem.mockResolvedValueOnce('fr');

    await renderProvider();
    await screen.findByText('ready');

    expect(['ar', 'en']).toContain(
      screen.getByTestId('language').props.children,
    );
    expect(i18n.language).not.toBe('fr');
  });

  it('switches language, direction and the i18next instance together', async () => {
    await renderProvider();
    await screen.findByText('ready');

    await act(async () => {
      screen.getByTestId('to-arabic').props.onPress();
    });

    await waitFor(() =>
      expect(screen.getByTestId('language').props.children).toBe('ar'),
    );
    expect(screen.getByTestId('direction').props.children).toBe('rtl');
    expect(i18n.language).toBe('ar');
    expect(i18n.t('nav.home')).toBe('الرئيسية');
  });

  it('persists the chosen language', async () => {
    await renderProvider();
    await screen.findByText('ready');

    await act(async () => {
      await setLanguage('ar');
    });

    expect(storage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.language, 'ar');
  });

  it('reports a restart when the native RTL flag disagrees', async () => {
    const forceRTL = jest.spyOn(I18nManager, 'forceRTL');

    await renderProvider();
    await screen.findByText('ready');

    let restartRequired = false;
    await act(async () => {
      ({ restartRequired } = await setLanguage('ar'));
    });

    expect(forceRTL).toHaveBeenCalledWith(true);
    expect(restartRequired).toBe(true);
  });

  it('is a no-op when the language is already active', async () => {
    const result = await setLanguage('en');

    expect(result.restartRequired).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
